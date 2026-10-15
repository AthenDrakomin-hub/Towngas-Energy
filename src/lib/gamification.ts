import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { achievements, bets, userAchievements, userTasks, users } from "@/db/schema";
import { applyLedger } from "./ledger";
import { dateKey } from "./format";
import { logTerminal } from "./logs";

const TASK_CODES = ["daily_stake_3", "daily_rounds_5", "daily_signal_view"];

export async function ensureDailyTasks(userId: number) {
  const key = dateKey(new Date());
  for (const code of TASK_CODES) {
    await db
      .insert(userTasks)
      .values({ userId, taskCode: code, dateKey: key })
      .onConflictDoNothing();
  }
}

export async function bumpTask(userId: number, taskCode: string, delta = 1) {
  if (!TASK_CODES.includes(taskCode)) return;
  const key = dateKey(new Date());
  await db
    .insert(userTasks)
    .values({ userId, taskCode, dateKey: key, progress: delta })
    .onConflictDoUpdate({
      target: [userTasks.userId, userTasks.taskCode, userTasks.dateKey],
      set: { progress: sql`${userTasks.progress} + ${delta}` },
    });
}

export async function listTasks(userId: number) {
  const key = dateKey(new Date());
  const rows = await db.select().from(userTasks).where(and(eq(userTasks.userId, userId), eq(userTasks.dateKey, key)));
  const catalog = [
    { code: "daily_stake_3", name: "完成 3 笔投资份额", reward: 600, target: 3, description: "在任意演算周期内累计建立 3 笔投资份额" },
    { code: "daily_rounds_5", name: "参与 5 个演算周期", reward: 900, target: 5, description: "单日内参与不少于 5 个独立演算周期" },
    { code: "daily_signal_view", name: "查看 能源指数研判推理链路", reward: 200, target: 1, description: "进入 能源指数研判页并查看五因子分解" },
  ];
  return catalog.map((c) => {
    const row = rows.find((r) => r.taskCode === c.code);
    return {
      ...c,
      progress: row?.progress ?? 0,
      claimed: Boolean(row?.claimedAt),
      rewardLabel: c.reward,
    };
  });
}

export async function claimTask(userId: number, taskCode: string) {
  const key = dateKey(new Date());
  const rows = await db
    .select()
    .from(userTasks)
    .where(and(eq(userTasks.userId, userId), eq(userTasks.taskCode, taskCode), eq(userTasks.dateKey, key)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("任务不存在");
  if (row.claimedAt) throw new Error("任务奖励已领取");
  const catalog: Record<string, { reward: number; target: number; name: string }> = {
    daily_stake_3: { reward: 600, target: 3, name: "完成 3 笔投资份额" },
    daily_rounds_5: { reward: 900, target: 5, name: "参与 5 个演算周期" },
    daily_signal_view: { reward: 200, target: 1, name: "查看 能源指数研判推理链路" },
  };
  const meta = catalog[taskCode];
  if (!meta) throw new Error("任务不存在");
  if (row.progress < meta.target) throw new Error("任务尚未完成");
  await applyLedger({ userId, amount: meta.reward, type: "task", refId: `task:${taskCode}`, remark: `生态任务奖励 · ${meta.name}` });
  await db.update(userTasks).set({ claimedAt: new Date() }).where(eq(userTasks.id, row.id));
  return { reward: meta.reward };
}

export async function dailySignin(userId: number) {
  const key = dateKey(new Date());
  const marker = `signin:${key}`;
  const existing = await db
    .select({ id: sql<number>`count(*)::int` })
    .from(sql`ledger_entries`)
    .where(sql`user_id = ${userId} and ref_id = ${marker}`);
  if ((existing[0]?.id ?? 0) > 0) throw new Error("今日已完成签到");
  const { getConfig } = await import("./config");
  const cfg = await getConfig();
  await applyLedger({
    userId,
    amount: cfg.dailySigninReward,
    type: "signin",
    refId: marker,
    remark: `每日签到 · ${key}`,
  });
  return { reward: cfg.dailySigninReward, dateKey: key };
}

/** 成就校验（真实数据触发） */
export async function checkAchievements(userIds: number[]) {
  const unique = Array.from(new Set(userIds));
  if (!unique.length) return;
  const all = await db.select().from(achievements);
  for (const userId of unique) {
    const stats = await userStats(userId);
    for (const ach of all) {
      const value = (stats as unknown as Record<string, number>)[ach.condition.metric] ?? 0;
      const hit =
        ach.condition.op === ">=" ? value >= ach.condition.value : ach.condition.op === ">" ? value > ach.condition.value : value === ach.condition.value;
      if (!hit) continue;
      const inserted = await db
        .insert(userAchievements)
        .values({ userId, achievementCode: ach.code })
        .onConflictDoNothing()
        .returning({ id: userAchievements.id });
      if (inserted.length) {
        if (ach.reward > 0) {
          await applyLedger({
            userId,
            amount: ach.reward,
            type: "grant",
            refId: `achievement:${ach.code}`,
            remark: `成就解锁 · ${ach.name}`,
          });
        }
        await logTerminal("info", "成就", `节点 #${userId} 解锁成就 ${ach.name} | 奖励 ${ach.reward.toLocaleString("en-US")} 碳积分`);
      }
    }
  }
}

export async function userStats(userId: number) {
  const rows = await db
    .select({
      rounds: sql<number>`count(distinct ${bets.roundId})::int`,
      volume: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
      wonRounds: sql<number>`count(*) filter (where ${bets.status} = 'won')::int`,
      settledBets: sql<number>`count(*) filter (where ${bets.status} in ('won','lost'))::int`,
      payout: sql<number>`coalesce(sum(${bets.payout}),0)::int`,
      bestRound: sql<number>`coalesce(max(${bets.payout} - ${bets.amount}),0)::int`,
    })
    .from(bets)
    .where(eq(bets.userId, userId));
  const r = rows[0];
  const profit = (r?.payout ?? 0) - (r?.volume ?? 0);
  const settled = r?.settledBets ?? 0;
  return {
    rounds: r?.rounds ?? 0,
    volume: r?.volume ?? 0,
    wonRounds: r?.wonRounds ?? 0,
    settledBets: settled,
    winRate: settled ? (r?.wonRounds ?? 0) / settled : 0,
    profit,
    roi: r?.volume ? profit / r.volume : 0,
    bestRound: r?.bestRound ?? 0,
  };
}

export async function profitCurve(userId: number, days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db
    .select({
      day: sql<string>`to_char(${bets.createdAt}, 'YYYY-MM-DD')`,
      profit: sql<number>`coalesce(sum(${bets.payout} - ${bets.amount}),0)::int`,
    })
    .from(bets)
    .where(and(eq(bets.userId, userId), gte(bets.createdAt, since)))
    .groupBy(sql`to_char(${bets.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${bets.createdAt}, 'YYYY-MM-DD')`);
  return rows;
}

export async function leaderboard(kind: "day" | "week" | "all" | "winrate" | "active") {
  const since =
    kind === "day"
      ? new Date(Math.floor(Date.now() / 86400000) * 86400000)
      : kind === "week"
        ? new Date(Date.now() - 7 * 86400000)
        : null;
  const base = db
    .select({
      userId: bets.userId,
      nickname: users.nickname,
      username: users.username,
      role: users.role,
      volume: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
      profit: sql<number>`coalesce(sum(${bets.payout} - ${bets.amount}),0)::int`,
      rounds: sql<number>`count(distinct ${bets.roundId})::int`,
      won: sql<number>`count(*) filter (where ${bets.status} = 'won')::int`,
      settled: sql<number>`count(*) filter (where ${bets.status} in ('won','lost'))::int`,
    })
    .from(bets)
    .innerJoin(users, eq(users.id, bets.userId))
    .where(eq(bets.isFake, false))
    .groupBy(bets.userId, users.nickname, users.username, users.role);
  const rows = since ? await base.having(sql`min(${bets.createdAt}) >= ${since.toISOString()}`) : await base;
  const filtered = since ? rows.filter((r) => r.rounds > 0) : rows;
  const sorted = filtered.sort((a, b) => {
    if (kind === "winrate") return b.won / Math.max(1, b.settled) - a.won / Math.max(1, a.settled) || b.settled - a.settled;
    if (kind === "active") return b.rounds - a.rounds || b.volume - a.volume;
    if (kind === "all") return b.profit - a.profit;
    return b.profit - a.profit;
  });
  return sorted.slice(0, 50).map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    nickname: r.nickname,
    volume: r.volume,
    profit: r.profit,
    rounds: r.rounds,
    winRate: r.settled ? r.won / r.settled : 0,
    settled: r.settled,
    isBot: r.role === "bot",
  }));
}

export async function recentAchievements(userId: number) {
  return db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt))
    .limit(20);
}
