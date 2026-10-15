import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  bets,
  resultOverrides,
  roundSettlements,
  rounds,
  signals as signalsTable,
  users,
} from "@/db/schema";
import { BETTING_SEC, LOCK_BUFFER_SEC, PERIODS, PERIOD_KEYS, WINDOW_MS, type PeriodKey } from "./constants";
import { getConfig, type PlatformConfig } from "./config";
import { lastCarInWindow, runCollector } from "./collector";
import { applyLedger, ensureAccount } from "./ledger";
import { logTerminal, pruneLogs } from "./logs";
import { buildPayoutPlan, decideResult, type SettlementResult } from "./settlement";
import { computeSignal, persistSignal } from "./signal";
import { roundCodeOf } from "./format";
import { checkAchievements } from "./gamification";

export type RoundRow = typeof rounds.$inferSelect;

/** 按周期类型计算时间边界，结算时刻错开 */
export function windowBounds(period: PeriodKey = "5m", now = new Date()) {
  const cfg = PERIODS[period];
  const offsetMs = cfg.settleOffsetSec * 1000;
  const adjusted = new Date(now.getTime() - offsetMs);
  const index = Math.floor(adjusted.getTime() / cfg.windowMs);
  const start = new Date(index * cfg.windowMs + offsetMs);
  return { start, end: new Date(start.getTime() + cfg.windowMs) };
}

const lockState = globalThis as typeof globalThis & { __cnxTick?: Promise<void>; __cnxLastTick?: number };

/** 引擎心跳：由 SSE 流与 API 请求驱动，内部限频，多周期并行 */
export async function tickEngine(forceCollector = false): Promise<void> {
  const now = Date.now();
  if (lockState.__cnxLastTick && now - lockState.__cnxLastTick < 900 && !forceCollector) return;
  if (lockState.__cnxTick) return lockState.__cnxTick;
  lockState.__cnxLastTick = now;
  lockState.__cnxTick = (async () => {
    try {
      const cfg = await getConfig();
      await runCollector(forceCollector);
      await settleOverdueRounds(cfg);
      await advancePhases(cfg);
      // 遍历所有周期，确保每个周期都有当前轮次
      for (const period of PERIOD_KEYS) {
        await ensureCurrentRound(cfg, period);
        await marketMake(cfg, period);
        await refreshSignal(cfg, period);
      }
      if (Math.random() < 0.05) await pruneLogs();
    } catch (err) {
      await logTerminal("error", "引擎", `周期引擎异常 | ${err instanceof Error ? err.message : "未知"}`);
    } finally {
      lockState.__cnxTick = undefined;
    }
  })();
  return lockState.__cnxTick;
}

export async function ensureRoundForWindow(start: Date, cfg: PlatformConfig, period: PeriodKey = "5m"): Promise<RoundRow> {
  const periodCfg = PERIODS[period];
  const code = `${period}-${roundCodeOf(start)}`;
  const existing = await db.select().from(rounds).where(eq(rounds.code, code)).limit(1);
  if (existing[0]) return existing[0];
  const lockTime = new Date(start.getTime() + periodCfg.bettingSec * 1000);
  const settleTime = new Date(start.getTime() + periodCfg.windowMs);
  const inserted = await db
    .insert(rounds)
    .values({
      code,
      periodType: period,
      startTime: start,
      lockTime,
      settleTime,
      status: "betting",
      rakeRate: cfg.rakeRate,
    })
    .onConflictDoNothing({ target: rounds.code })
    .returning();
  if (inserted[0]) {
    await logTerminal(
      "info",
      "推送",
      `新周期 ${code} 已开盘 | ${periodCfg.label} | 投资窗口 ${start.toISOString().slice(11, 16)}-${lockTime.toISOString().slice(11, 16)} UTC`,
    );
    return inserted[0];
  }
  const again = await db.select().from(rounds).where(eq(rounds.code, code)).limit(1);
  return again[0];
}

export async function advancePhases(cfg: PlatformConfig) {
  const due = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.status, "betting"), lte(rounds.lockTime, new Date())))
    .orderBy(asc(rounds.id))
    .limit(10);
  for (const round of due) {
    await db.update(rounds).set({ status: "locked" }).where(eq(rounds.id, round.id));
    await logTerminal(
      "info",
      "锁定",
      `周期 ${round.code} 已锁定 | 投资窗口关闭 | 等待 ES-77 清算数据`,
    );
  }
}

export async function settleOverdueRounds(cfg: PlatformConfig) {
  const due = await db
    .select()
    .from(rounds)
    .where(and(inArray(rounds.status, ["betting", "locked"]), lte(rounds.settleTime, new Date())))
    .orderBy(asc(rounds.id))
    .limit(6);
  for (const round of due) {
    await settleRound(round, cfg, false);
  }
}

export async function ensureCurrentRound(cfg: PlatformConfig, period: PeriodKey = "5m") {
  const { start } = windowBounds(period);
  await ensureRoundForWindow(start, cfg, period);
}

async function platformUserId(): Promise<number> {
  const rows: { id: number }[] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "__platform__"))
    .limit(1);
  if (rows.length > 0) return rows[0].id;
  const created: { id: number }[] = await db
    .insert(users)
    .values({
      username: "__platform__",
      passwordHash: "system",
      nickname: "平台流动性账户",
      role: "system",
    })
    .onConflictDoNothing({ target: users.username })
    .returning({ id: users.id });
  if (created.length > 0) {
    await ensureAccount(created[0].id);
    return created[0].id;
  }
  const again: { id: number }[] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "__platform__"))
    .limit(1);
  return again[0].id;
}

export async function takeOverride(round: RoundRow): Promise<"up" | "down" | "draw" | null> {
  const rows = await db
    .select()
    .from(resultOverrides)
    .where(and(isNull(resultOverrides.consumedAt), or(eq(resultOverrides.roundId, round.id), eq(resultOverrides.roundCode, round.code))))
    .orderBy(desc(resultOverrides.id))
    .limit(1);
  let row = rows[0];
  if (!row) {
    const generic = await db
      .select()
      .from(resultOverrides)
      .where(and(isNull(resultOverrides.consumedAt), isNull(resultOverrides.roundId), isNull(resultOverrides.roundCode)))
      .orderBy(desc(resultOverrides.id))
      .limit(1);
    row = generic[0];
  }
  if (!row) return null;
  await db.update(resultOverrides).set({ consumedAt: new Date(), appliedAt: new Date() }).where(eq(resultOverrides.id, row.id));
  return row.direction as "up" | "down" | "draw";
}

/** 清算：规则引擎 + 赔付计算 + 账本写入 */
export async function settleRound(
  round: RoundRow,
  cfg: PlatformConfig,
  allowReplay: boolean,
): Promise<{ result: SettlementResult; source: string; note: string }> {
  if (round.status === "settled" || round.status === "cancelled") {
    return { result: (round.result ?? "draw") as SettlementResult, source: round.resultSource ?? "rule_a", note: "已结算" };
  }
  const windowStart = round.startTime;
  const windowEnd = round.settleTime;
  const snap = await lastCarInWindow(windowStart, windowEnd);
  const liveSnap = snap && snap.source !== "replay" ? snap : null;
  const effectiveSnap = liveSnap ?? (allowReplay ? snap : null);

  const sig = await db
    .select()
    .from(sql`signals` as never)
    .limit(0)
    .catch(() => []);
  void sig;

  const signalRow = await db
    .select()
    .from((await import("@/db/schema")).signals)
    .where(eq((await import("@/db/schema")).signals.roundId, round.id))
    .limit(1);
  const aiDirection = signalRow[0]?.direction === "up" || signalRow[0]?.direction === "down" ? signalRow[0].direction : "flat";

  const override = await takeOverride(round);
  const decision = decideResult({
    car: effectiveSnap?.car ?? null,
    roundCode: round.code,
    aiDirection,
    cfg,
    override,
  });

  const roundBets = await db.select().from(bets).where(eq(bets.roundId, round.id));
  const plan = buildPayoutPlan({
    result: decision.result,
    rakeRate: round.rakeRate ?? cfg.rakeRate,
    bets: roundBets.map((b) => ({ id: b.id, userId: b.userId, side: b.side, amount: b.amount, isFake: b.isFake })),
  });

  const pid = await platformUserId();

  for (const refund of plan.refunds) {
    if (refund.amount <= 0) continue;
    await applyLedger({
      userId: refund.userId,
      amount: refund.amount,
      type: "refund",
      refId: `round:${round.id}`,
      remark: `周期 ${round.code} 平局退还投资份额`,
    });
    await db.update(bets).set({ status: "refunded", payout: refund.amount }).where(eq(bets.id, refund.betId));
  }
  for (const upd of plan.updates) {
    if (upd.payout > 0) {
      await applyLedger({
        userId: upd.userId,
        amount: upd.payout,
        type: "payout",
        refId: `round:${round.id}`,
        remark: `周期 ${round.code} 清算收益（结算率 ${plan.ratio.toFixed(2)}x）`,
      });
    }
    await db.update(bets).set({ status: upd.status, payout: upd.payout }).where(eq(bets.id, upd.betId));
  }
  for (const ab of plan.absorbed) {
    await db.update(bets).set({ status: "absorbed", payout: 0 }).where(eq(bets.id, ab.betId));
  }
  if (plan.rakeAmount > 0) {
    await applyLedger({
      userId: pid,
      amount: plan.rakeAmount,
      type: "rake",
      refId: `round:${round.id}`,
      remark: `周期 ${round.code} 生态服务费回收`,
    });
  }

  const participants = new Set(roundBets.filter((b) => !b.isFake).map((b) => b.userId)).size;
  const resultSource = effectiveSnap ? (effectiveSnap.source === "replay" ? "archive_replay" : decision.source) : decision.source;
  await db
    .update(rounds)
    .set({
      status: "settled",
      result: decision.result,
      resultSource,
      rakeAmount: plan.rakeAmount,
      settleCar: effectiveSnap?.car ?? null,
      participants,
    })
    .where(eq(rounds.id, round.id));

  await db.insert(roundSettlements).values({
    roundId: round.id,
    windowStart,
    windowEnd,
    settlementCar: effectiveSnap?.car ?? null,
    settlementOnlinetime: effectiveSnap?.onlinetime ?? null,
    settlementOnlineCount: effectiveSnap?.onlineCount ?? null,
    result: decision.result,
    resultSource,
  });

  await logTerminal("info", "对齐", `周期 ${round.code} 对齐 | 窗口=${windowStart.toISOString().slice(11, 16)}-${windowEnd.toISOString().slice(11, 16)}`);
  if (decision.analysis) {
    await logTerminal("info", "信号", `AI推理 | ${decision.note} → ${decision.source === "rule_b" ? "仲裁中..." : "判定完成"}`);
  }
  await logTerminal(
    decision.result === "draw" ? "warn" : "info",
    "清算",
    `周期 ${round.code} 清算 | 结果=${decision.result === "up" ? "看多" : decision.result === "down" ? "看空" : "平局"} | 服务费=${plan.rakeAmount.toLocaleString("en-US")}`,
  );
  await logTerminal(
    "info",
    "推送",
    `清算事件已推送 | 下一周期窗口 ${windowEnd.toISOString().slice(11, 16)}-${new Date(windowEnd.getTime() + WINDOW_MS).toISOString().slice(11, 16)}`,
  );

  await checkAchievements(roundBets.filter((b) => !b.isFake).map((b) => b.userId));

  return { result: decision.result, source: decision.source, note: decision.note };
}

/** 流动性维护：根据池子不平衡度自动在弱势方补充流动性，按周期类型隔离 */
export async function marketMake(cfg: PlatformConfig, period: PeriodKey = "5m") {
  if (!cfg.marketMaking) return;
  const periodCfg = PERIODS[period];
  const { start } = windowBounds(period);
  const round = await db.select().from(rounds).where(and(eq(rounds.startTime, start), eq(rounds.periodType, period))).limit(1);
  const current = round[0];
  if (!current || current.status !== "betting") return;

  const botRows = await db.select().from(users).where(eq(users.role, "bot")).limit(40);
  if (!botRows.length) return;

  // 基于池子不平衡度决定流动性维护方向和金额：弱势方补充流动性
  const total = current.totalPool || 1;
  const imbalance = (current.upPool - current.downPool) / total;
  const targetSide = imbalance > 0.05 ? "down" : imbalance < -0.05 ? "up" : null;
  if (!targetSide) return;

  // 按周期类型调整做市强度
  const intensity = period === "1m" ? 0.5 : period === "30m" ? 2 : 1;
  const botCount = Math.min(2, Math.floor(Math.abs(imbalance) * 10 * intensity) + 1);
  const baseAmount = Math.round(periodCfg.minBet * (1 + Math.abs(imbalance) * 3));
  let stake = 0;

  for (let i = 0; i < botCount; i += 1) {
    const bot = botRows[i % botRows.length];
    const amount = Math.min(baseAmount, periodCfg.maxBetPerRound);
    await db.insert(bets).values({ roundId: current.id, userId: bot.id, side: targetSide, amount, isFake: true });
    stake += amount;
  }

  if (stake > 0) {
    await db
      .update(rounds)
      .set(
        targetSide === "up"
          ? { upPool: sql`${rounds.upPool} + ${stake}`, totalPool: sql`${rounds.totalPool} + ${stake}` }
          : { downPool: sql`${rounds.downPool} + ${stake}`, totalPool: sql`${rounds.totalPool} + ${stake}` },
      )
      .where(eq(rounds.id, current.id));
  }
}

export async function refreshSignal(cfg: PlatformConfig, period: PeriodKey = "5m") {
  const { start } = windowBounds(period);
  const round = await db.select().from(rounds).where(and(eq(rounds.startTime, start), eq(rounds.periodType, period))).limit(1);
  const current = round[0];
  if (!current) return;
  const existing = await db.select().from(signalsTable).where(eq(signalsTable.roundId, current.id)).limit(1);
  const bias = current.totalPool > 0 ? (current.upPool - current.downPool) / current.totalPool : 0;
  const snapshot = await computeSignal({ id: current.id, code: current.code }, bias);
  if (existing.length && Math.random() > 0.12) return;
  await persistSignal(snapshot);
}

export type BetInput = { userId: number; roundId: number; side: "up" | "down"; amount: number };

export async function placeBet(input: BetInput) {
  const cfg = await getConfig();
  const roundRows = await db.select().from(rounds).where(eq(rounds.id, input.roundId)).limit(1);
  const round = roundRows[0];
  if (!round) throw new Error("周期不存在");
  if (round.status !== "betting") throw new Error("当前周期已锁定，投资窗口已关闭");
  if (Date.now() >= round.lockTime.getTime()) throw new Error("投资窗口已关闭");

  const userRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  const user = userRows[0];
  if (!user) throw new Error("节点不存在");
  if (user.status === "banned") throw new Error("账号已被冻结，无法建立投资份额");
  if (user.status === "cooldown") throw new Error("冷静期生效中，请稍后再试");
  if (user.role === "bot") throw new Error("流动性维护节点不可手动建立投资份额");

  const amount = Math.floor(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("投资份额数量无效");
  if (amount < cfg.minBet) throw new Error(`最小投资份额 ${cfg.minBet} 碳积分`);
  if (amount > cfg.maxBetPerRound) throw new Error(`单周期投资份额上限 ${cfg.maxBetPerRound} 碳积分`);

  const dayStart = new Date(Math.floor(Date.now() / 86400000) * 86400000);
  const [{ staked }] = await db
    .select({ staked: sql<number>`coalesce(sum(${bets.amount}),0)::int` })
    .from(bets)
    .where(and(eq(bets.userId, input.userId), gte(bets.createdAt, dayStart), eq(bets.isFake, false)));
  if (Number(staked) + amount > cfg.maxDailyStake) {
    throw new Error(`已达每日投资份额上限 ${cfg.maxDailyStake.toLocaleString("en-US")} 碳积分（理性参与）`);
  }

  const balance = await db
    .select({ balance: accounts.balance })
    .from(accounts)
    .where(eq(accounts.userId, input.userId))
    .limit(1);
  if ((balance[0]?.balance ?? 0) < amount) throw new Error("碳积分不足");

  const shadow = user.status === "shadow_banned";
  await applyLedger({
    userId: input.userId,
    amount: -amount,
    type: "bet",
    refId: `round:${round.id}`,
    remark: `周期 ${round.code} 建立${input.side === "up" ? "看多" : "看空"}投资份额`,
  });
  const inserted = await db
    .insert(bets)
    .values({ roundId: round.id, userId: input.userId, side: input.side, amount, isFake: shadow })
    .returning({ id: bets.id });

  if (!shadow) {
    await db
      .update(rounds)
      .set(
        input.side === "up"
          ? { upPool: sql`${rounds.upPool} + ${amount}`, totalPool: sql`${rounds.totalPool} + ${amount}` }
          : { downPool: sql`${rounds.downPool} + ${amount}`, totalPool: sql`${rounds.totalPool} + ${amount}` },
      )
      .where(eq(rounds.id, round.id));
    await logTerminal(
      "info",
      "投资份额",
      `节点 #${user.id} 建立${input.side === "up" ? "看多" : "看空"}投资份额 ${amount.toLocaleString("en-US")} 碳积分 | 周期 ${round.code}`,
    );
  }

  return { betId: inserted[0]?.id ?? 0, shadow };
}

export async function roundSnapshot(roundId: number, userId?: number) {
  const rows = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
  const round = rows[0];
  if (!round) return null;
  const cfg = await getConfig();
  const now = Date.now();
  const phase =
    round.status === "settled"
      ? "settled"
      : round.status === "cancelled"
        ? "cancelled"
        : now < round.lockTime.getTime()
          ? "betting"
          : "settling";
  const upPool = round.upPool;
  const downPool = round.downPool;
  const totalPool = upPool + downPool;
  const payoutUp = upPool > 0 ? (totalPool * (1 - round.rakeRate)) / upPool : 0;
  const payoutDown = downPool > 0 ? (totalPool * (1 - round.rakeRate)) / downPool : 0;
  let myBets: { id: number; side: string; amount: number; payout: number; status: string }[] = [];
  if (userId) {
    myBets = await db
      .select({ id: bets.id, side: bets.side, amount: bets.amount, payout: bets.payout, status: bets.status })
      .from(bets)
      .where(and(eq(bets.roundId, roundId), eq(bets.userId, userId)));
  }
  return {
    id: round.id,
    code: round.code,
    periodType: round.periodType,
    assetSymbol: round.assetSymbol,
    startTime: round.startTime,
    lockTime: round.lockTime,
    settleTime: round.settleTime,
    status: round.status,
    phase,
    secondsToLock: Math.max(0, Math.floor((round.lockTime.getTime() - now) / 1000)),
    secondsToSettle: Math.max(0, Math.floor((round.settleTime.getTime() - now) / 1000)),
    upPool,
    downPool,
    totalPool,
    rakeRate: round.rakeRate,
    rakeAmount: Math.round(totalPool * round.rakeRate),
    payoutUp,
    payoutDown,
    upShare: totalPool > 0 ? upPool / totalPool : 0,
    downShare: totalPool > 0 ? downPool / totalPool : 0,
    participants: round.participants,
    result: round.result,
    resultSource: round.resultSource,
    settleCar: round.settleCar,
    minBet: cfg.minBet,
    maxBetPerRound: cfg.maxBetPerRound,
    myBets,
    serverTime: new Date().toISOString(),
  };
}

export async function currentRoundSnapshot(userId?: number, period: PeriodKey = "5m") {
  const { start } = windowBounds(period);
  const rows = await db.select().from(rounds).where(and(eq(rounds.startTime, start), eq(rounds.periodType, period))).limit(1);
  let round = rows[0];
  if (!round) {
    const cfg = await getConfig();
    round = await ensureRoundForWindow(start, cfg, period);
  }
  return roundSnapshot(round.id, userId);
}

export async function roundsHistory(limit = 60, offset = 0, period?: PeriodKey) {
  const conditions = [lt(rounds.startTime, new Date())];
  if (period) conditions.push(eq(rounds.periodType, period));
  return db
    .select({
      id: rounds.id,
      code: rounds.code,
      periodType: rounds.periodType,
      startTime: rounds.startTime,
      settleTime: rounds.settleTime,
      status: rounds.status,
      totalPool: rounds.totalPool,
      upPool: rounds.upPool,
      downPool: rounds.downPool,
      result: rounds.result,
      resultSource: rounds.resultSource,
      settleCar: rounds.settleCar,
      rakeAmount: rounds.rakeAmount,
      participants: rounds.participants,
    })
    .from(rounds)
    .where(and(...conditions))
    .orderBy(desc(rounds.startTime))
    .limit(limit)
    .offset(offset);
}
