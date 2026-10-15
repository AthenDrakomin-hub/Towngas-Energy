import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  achievements,
  announcements,
  bets,
  carResults,
  rounds,
  terminalLogs,
  users,
} from "@/db/schema";
import { hashPassword } from "./auth";
import { getConfig } from "./config";
import { fetchApiData, fetchPageData } from "./collector";
import { ensureRoundForWindow, settleRound } from "./engine";
import { applyLedger } from "./ledger";
import { logTerminal } from "./logs";
import { analyzeCar, seededUnit } from "./settlement";
import { computeSignal, persistSignal } from "./signal";
import { roundCodeOf } from "./format";

const BOOTSTRAP_LOCK = 918273645;
const globalForBootstrap = globalThis as typeof globalThis & { __cnxBootstrap?: Promise<void> };

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 确定性 Fisher-Yates（回放归档段使用，保证可复现） */
function shuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let s = hashSeed(seed) || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((s / 4294967296) * (i + 1));
    const k = Math.min(i, Math.max(0, j));
    [out[i], out[k]] = [out[k], out[i]];
  }
  return out;
}

const BOT_NAMES = [
  "深圳前海储能集群",
  "苏州工业园微网",
  "南京江宁光伏矩阵",
  "上海临港虚拟电厂",
  "广州增城热电联产",
  "杭州萧山能效单元",
  "成都天府碳资产池",
  "武汉光谷负荷聚合",
  "青岛西海岸多能联供",
  "西安高新绿电交易",
  "佛山南海区域供热",
  "无锡太湖零碳园区",
  "宁波镇海炼化余热",
  "合肥滨湖科学城",
  "郑州航空港区",
  "长沙湘江智造",
  "重庆两江新区",
  "天津滨海储能站",
  "济南先行区",
  "福州滨海新城",
  "昆明呈贡信息园",
  "沈阳中德园",
  "哈尔滨新区",
  "乌鲁木齐甘泉堡",
];

export async function ensureBootstrap(): Promise<void> {
  if (globalForBootstrap.__cnxBootstrap) return globalForBootstrap.__cnxBootstrap;
  globalForBootstrap.__cnxBootstrap = (async () => {
    const locked = await db.execute<{ locked: boolean }>(sql`select pg_try_advisory_lock(${BOOTSTRAP_LOCK}) as locked`);
    const gotLock = Boolean((locked.rows?.[0] as { locked?: boolean } | undefined)?.locked);
    if (!gotLock) return;
    try {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      if ((count ?? 0) > 0) return;
      await seed();
    } catch (err) {
      await logTerminal("error", "引导", `生态初始化异常 | ${err instanceof Error ? err.message : "未知"}`);
    } finally {
      if (gotLock) await db.execute(sql`select pg_advisory_unlock(${BOOTSTRAP_LOCK})`);
    }
  })();
  return globalForBootstrap.__cnxBootstrap;
}

async function seed() {
  const cfg = await getConfig();
  const started = Date.now();

  // ── 节点创建 ─────────────────────────────────────────────
  const adminId = await createUser("admin", "Admin@2026", "超级管理员", "super", ["管理端", "全权限"]);
  const observerId = await createUser("ops", "Ops@2026", "运营管理员", "ops", ["轮次", "用户", "内容"]);
  const financeId = await createUser("finance", "Fin@2026", "财务管理员", "finance", ["积分", "看板"]);
  const demoId = await createUser("demo", "Demo@2026", "生态节点·演示账户", "user", ["演示账户", "内部体验"]);
  const botIds: number[] = [];
  for (let i = 0; i < BOT_NAMES.length; i += 1) {
    botIds.push(await createUser(`node_bot_${String(i + 1).padStart(2, "0")}`, `*bot*${i}`, BOT_NAMES[i], "bot", ["流动性维护节点"]));
  }

  for (const id of [adminId, observerId, financeId, demoId]) {
    await applyLedger({
      userId: id,
      amount: id === demoId ? 500000 : 100000,
      type: "grant",
      refId: "bootstrap:grant",
      remark: "碳积分初始发放（虚拟积分，仅供娱乐）",
    });
  }

  // ── 实时采集（真实 ES-77 数据） ──────────────────────────
  const apiRows = await fetchApiData().catch(() => [] as { onlinetime: Date; car: number[] }[]);
  const page = await fetchPageData().catch(() => ({ onlineCount: null, hashValue: null }));
  let realSeedCar = apiRows[0]?.car ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (const row of apiRows) {
    await db
      .insert(carResults)
      .values({ onlinetime: row.onlinetime, car: row.car, onlineCount: page.onlineCount, hashValue: page.hashValue, source: "es77" })
      .onConflictDoNothing({ target: carResults.onlinetime });
  }

  // ── 回放归档（演示用历史段，标记 source=replay，不参与实时判定） ──
  const realAnchor = apiRows.length ? apiRows[apiRows.length - 1].onlinetime.getTime() : Date.now();
  const archiveMinutes = 360;
  let online = page.onlineCount ?? 316_000_000;
  const archiveStart = new Date(Math.floor((realAnchor - archiveMinutes * 60_000) / 60_000) * 60_000);
  for (let i = 0; i < archiveMinutes; i += 1) {
    const ts = new Date(archiveStart.getTime() + i * 60_000);
    const car = shuffle(realSeedCar, `replay:${ts.getTime()}`);
    online = Math.max(100_000_000, Math.round(online + (seededUnit(`on:${ts.getTime()}`) - 0.5) * 4_000_000));
    const hash = createHash("sha512").update(`${ts.toISOString()}:${car.join("")}`).digest("hex");
    await db
      .insert(carResults)
      .values({ onlinetime: ts, car, onlineCount: online, hashValue: hash, source: "replay" })
      .onConflictDoNothing({ target: carResults.onlinetime });
  }

  // ── 历史周期 + 投资份额 + 清算 ─────────────────────────────
  const roundWindows: { start: Date }[] = [];
  const firstWindow = new Date(Math.floor(archiveStart.getTime() / 300_000) * 300_000);
  const lastWindow = new Date(Math.floor(Date.now() / 300_000) * 300_000);
  for (let t = firstWindow.getTime(); t < lastWindow.getTime(); t += 300_000) {
    roundWindows.push({ start: new Date(t) });
  }

  for (const w of roundWindows) {
    const round = await ensureRoundForWindow(w.start, cfg);
    // 生态流动性维护节点投资份额
    const nBots = 6 + Math.floor(seededUnit(`bots:${round.code}`) * 14);
    let up = 0;
    let down = 0;
    for (let i = 0; i < nBots; i += 1) {
      const uid = botIds[Math.floor(seededUnit(`uid:${round.code}:${i}`) * botIds.length)];
      const side = seededUnit(`side:${round.code}:${i}`) > 0.5 ? "up" : "down";
      const amount = Math.round((500 + seededUnit(`amt:${round.code}:${i}`) * 9000) / 50) * 50;
      await db.insert(bets).values({ roundId: round.id, userId: uid, side, amount, isFake: true });
      if (side === "up") up += amount;
      else down += amount;
    }
    // 演示账户真实投资份额（约 1/3 周期）
    if (seededUnit(`demo:${round.code}`) > 0.66) {
      const side = seededUnit(`dside:${round.code}`) > 0.5 ? "up" : "down";
      const amount = Math.round((1000 + seededUnit(`damt:${round.code}`) * 6000) / 100) * 100;
      const balanceRow = await db.select().from(accounts).where(eq(accounts.userId, demoId)).limit(1);
      if ((balanceRow[0]?.balance ?? 0) > amount * 3) {
        await applyLedger({
          userId: demoId,
          amount: -amount,
          type: "bet",
          refId: `round:${round.id}`,
          remark: `周期 ${round.code} 建立${side === "up" ? "看多" : "看空"}投资份额`,
        });
        await db.insert(bets).values({ roundId: round.id, userId: demoId, side, amount, isFake: false });
        if (side === "up") up += amount;
        else down += amount;
      }
    }
    await db
      .update(rounds)
      .set({ upPool: up, downPool: down, totalPool: up + down })
      .where(eq(rounds.id, round.id));
    // 先生成该周期的 能源指数研判，使规则B（五因子仲裁）在历史回放中同样生效
    const snapshot = await computeSignal(
      { id: round.id, code: round.code },
      up + down > 0 ? (up - down) / (up + down) : 0,
      round.settleTime,
    );
    await persistSignal(snapshot);
    await settleRound(round, cfg, true);
  }

  // ── 内容 ───────────────────────────────────────────────
  await db.insert(announcements).values([
    {
      title: "碳汭星云 2.0 演算内核升级完成",
      content:
        "生态演算平台已完成 2.0 内核切换：AIoT 边缘采集节点接入生态数据源·ES-77，5 分钟周期对齐精度提升至秒级，四大平台能力（港华绿电 / 港华碳资产 / 港华数能 / 港华综能）全部运行中。请记住：虚拟积分，仅供娱乐。",
      type: "info",
      status: "published",
    },
    {
      title: "生态服务费率说明（5%）",
      content:
        "为控制内部虚拟积分通胀，每个演算周期将收取 5% 生态服务费，用于积分回收。该机制为负期望结构，仅服务于积分体系平衡，平台不产生任何真实收益。",
      type: "info",
      status: "published",
    },
    {
      title: "理性参与提醒",
      content:
        "演算周期频率为每天 288 轮，属于高频节奏。平台已内置每日投资份额上限、在线时长提醒与自助冷静期，请在“我的-参与保护”中按需开启。",
      type: "warning",
      status: "published",
    },
  ]);

  await db.insert(achievements).values([
    { code: "first_step", name: "首次建仓", description: "完成第一笔生态投资份额", icon: "◈", condition: { metric: "rounds", op: ">=", value: 1 }, reward: 500 },
    { code: "ten_rounds", name: "周期常客", description: "累计参与 10 个演算周期", icon: "◇", condition: { metric: "rounds", op: ">=", value: 10 }, reward: 1500 },
    { code: "half_century", name: "星云守望者", description: "累计参与 50 个演算周期", icon: "◉", condition: { metric: "rounds", op: ">=", value: 50 }, reward: 5000 },
    { code: "sharp_eye", name: "结构洞察", description: "结算胜率 ≥ 55% 且结算笔数 ≥ 20", icon: "◆", condition: { metric: "winRate", op: ">=", value: 0.55 }, reward: 3000 },
    { code: "profit_10k", name: "生态贡献者", description: "累计结算盈利 10,000 碳积分", icon: "★", condition: { metric: "profit", op: ">=", value: 10000 }, reward: 2500 },
    { code: "volume_100k", name: "流动性支柱", description: "累计投资份额规模 100,000 碳积分", icon: "▣", condition: { metric: "volume", op: ">=", value: 100000 }, reward: 4000 },
  ]);

  const [{ count: carCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(carResults);
  await logTerminal("info", "引导", `生态初始化完成 | 节点=${BOT_NAMES.length + 4} | 归档记录=${carCount} | 用时=${((Date.now() - started) / 1000).toFixed(1)}s`);
  await logTerminal("info", "数据", `实时段=es77 | 回放段=replay（仅演示归档，不参与实时判定）`);
  await db.insert(terminalLogs).values({
    level: "info",
    module: "引擎",
    message: `周期引擎上线 | 已回放 ${roundWindows.length} 个演算周期 | 示例 ${roundCodeOf(firstWindow)} 末位=${analyzeCar(realSeedCar).composite}`,
  });
  void adminId;
  void observerId;
  void financeId;
  void demoId;
}

async function createUser(
  username: string,
  password: string,
  nickname: string,
  role: string,
  tags: string[],
): Promise<number> {
  const rows = await db
    .insert(users)
    .values({ username, passwordHash: hashPassword(password), nickname, role, tags, status: "active" })
    .onConflictDoNothing({ target: users.username })
    .returning({ id: users.id });
  if (rows[0]) return rows[0].id;
  const again = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  return again[0].id;
}

/** 供管理端查看的初始化状态 */
export async function bootstrapStatus() {
  const rows = await db
    .select({ source: carResults.source, count: sql<number>`count(*)::int` })
    .from(carResults)
    .groupBy(carResults.source);
  const oldest = await db.select({ ts: carResults.onlinetime }).from(carResults).orderBy(asc(carResults.onlinetime)).limit(1);
  return {
    segments: rows,
    archiveFrom: oldest[0]?.ts ?? null,
  };
}

export async function isSeeded(): Promise<boolean> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return (count ?? 0) > 0;
}

export const _internal = { and };
