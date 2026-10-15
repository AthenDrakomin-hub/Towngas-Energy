import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, bets, carResults, collectorRuns, rounds, users } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { getConfig } from "@/lib/config";
import { currentRoundSnapshot, tickEngine } from "@/lib/engine";
import { latestCar } from "@/lib/collector";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ metric: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { metric } = await ctx.params;
  try {
    await ensureBootstrap();
    await requireScope("dashboard");
    await tickEngine();

    if (metric === "realtime") {
      const round = await currentRoundSnapshot();
      const car = (await latestCar(1))[0] ?? null;
      const [nodeAgg] = await db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where status = 'active')::int`,
          banned: sql<number>`count(*) filter (where status = 'banned')::int`,
          shadow: sql<number>`count(*) filter (where status = 'shadow_banned')::int`,
        })
        .from(users);
      const [todayBets] = await db
        .select({
          volume: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(bets)
        .where(gte(bets.createdAt, new Date(Math.floor(Date.now() / 86400000) * 86400000)));

      // 真实系统指标：采集成功率、最新采集时间、在线节点、池子规模
      const [collectorStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          success: sql<number>`count(*) filter (where status = 'success')::int`,
          latest: sql<string>`max(${collectorRuns.startedAt})`,
        })
        .from(collectorRuns)
        .where(gte(collectorRuns.startedAt, new Date(Date.now() - 3600_000)));
      const collectRate = collectorStats?.total
        ? Math.round((collectorStats.success / collectorStats.total) * 100)
        : 100;
      const lastCollect = collectorStats?.latest
        ? new Date(collectorStats.latest).toLocaleTimeString("zh-CN", { hour12: false })
        : "--:--:--";

      return ok({
        round,
        car,
        nodes: nodeAgg,
        todayBets,
        platforms: [
          { name: "港华绿电", state: "采集中", detail: `数据源 ${collectRate}% 成功 | 最近 ${lastCollect}` },
          { name: "港华碳资产", state: "结算中", detail: `今日交易 ${todayBets.count} 笔 | 池子 ${Math.round((round?.totalPool ?? 0) / 10000)} 万` },
          { name: "港华数能", state: "在线", detail: `活跃用户 ${nodeAgg.active} / ${nodeAgg.total} 人` },
          { name: "港华综能", state: "运行中", detail: `虚拟电厂调度 | 综合能源服务` },
        ],
        config: await getConfig(),
      });
    }

    if (metric === "users") {
      const growth = await db
        .select({
          day: sql<string>`to_char(${users.createdAt}, 'MM-DD')`,
          signups: sql<number>`count(*)::int`,
        })
        .from(users)
        .where(eq(users.role, "user"))
        .groupBy(sql`to_char(${users.createdAt}, 'MM-DD')`)
        .orderBy(sql`to_char(${users.createdAt}, 'MM-DD')`)
        .limit(14);
      const active = await db
        .select({
          day: sql<string>`to_char(${bets.createdAt}, 'MM-DD')`,
          actives: sql<number>`count(distinct ${bets.userId})::int`,
        })
        .from(bets)
        .groupBy(sql`to_char(${bets.createdAt}, 'MM-DD')`)
        .orderBy(sql`to_char(${bets.createdAt}, 'MM-DD')`)
        .limit(14);
      const [totals] = await db
        .select({
          nodes: sql<number>`count(*) filter (where role = 'user')::int`,
          bots: sql<number>`count(*) filter (where role = 'bot')::int`,
          admins: sql<number>`count(*) filter (where role in ('admin','super','ops','finance','observer','support'))::int`,
        })
        .from(users);
      const [balanceAgg] = await db
        .select({
          avg: sql<number>`coalesce(avg(${accounts.balance}),0)::int`,
          max: sql<number>`coalesce(max(${accounts.balance}),0)::int`,
        })
        .from(accounts);
      return ok({ growth, active, totals, balanceAgg });
    }

    if (metric === "bets") {
      const hourly = await db
        .select({
          hour: sql<string>`to_char(${bets.createdAt}, 'HH24:00')`,
          volume: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(bets)
        .where(gte(bets.createdAt, new Date(Date.now() - 86400000)))
        .groupBy(sql`to_char(${bets.createdAt}, 'HH24:00')`)
        .orderBy(sql`to_char(${bets.createdAt}, 'HH24:00')`);
      const [agg] = await db
        .select({
          volume: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
          count: sql<number>`count(*)::int`,
          avg: sql<number>`coalesce(avg(${bets.amount}),0)::int`,
          large: sql<number>`count(*) filter (where ${bets.amount} >= 20000)::int`,
        })
        .from(bets);
      const distribution = await db
        .select({
          result: rounds.result,
          volume: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(bets)
        .innerJoin(rounds, eq(rounds.id, bets.roundId))
        .where(and(eq(bets.isFake, false), gte(bets.createdAt, new Date(Date.now() - 7 * 86400000))))
        .groupBy(rounds.result);
      return ok({ hourly, agg, distribution });
    }

    if (metric === "revenue") {
      const rows = await db
        .select({
          day: sql<string>`to_char(${rounds.settleTime}, 'MM-DD')`,
          rake: sql<number>`coalesce(sum(${rounds.rakeAmount}),0)::int`,
          pool: sql<number>`coalesce(sum(${rounds.totalPool}),0)::int`,
          roundsCount: sql<number>`count(*)::int`,
        })
        .from(rounds)
        .where(eq(rounds.status, "settled"))
        .groupBy(sql`to_char(${rounds.settleTime}, 'MM-DD')`)
        .orderBy(sql`to_char(${rounds.settleTime}, 'MM-DD')`)
        .limit(14);
      const [total] = await db
        .select({
          rake: sql<number>`coalesce(sum(${rounds.rakeAmount}),0)::int`,
          pool: sql<number>`coalesce(sum(${rounds.totalPool}),0)::int`,
        })
        .from(rounds)
        .where(eq(rounds.status, "settled"));
      const cfg = await getConfig();
      return ok({ rows, total, negativeExpectation: -cfg.rakeRate });
    }

    if (metric === "health") {
      const [roundAgg] = await db
        .select({
          settled: sql<number>`count(*) filter (where status = 'settled')::int`,
          gaps: sql<number>`count(*) filter (where result_source = 'collector_gap')::int`,
          overrides: sql<number>`count(*) filter (where result_source = 'admin_override')::int`,
        })
        .from(rounds);
      const { collectorHealth } = await import("@/lib/collector");
      const health = await collectorHealth();
      return ok({ roundAgg, health });
    }

    if (metric === "alerts") {
      const gaps = await db
        .select({ code: rounds.code, startTime: rounds.startTime, resultSource: rounds.resultSource })
        .from(rounds)
        .where(eq(rounds.resultSource, "collector_gap"))
        .orderBy(desc(rounds.id))
        .limit(10);
      const overrides = await db
        .select({ code: rounds.code, startTime: rounds.startTime, resultSource: rounds.resultSource })
        .from(rounds)
        .where(eq(rounds.resultSource, "admin_override"))
        .orderBy(desc(rounds.id))
        .limit(10);
      const whales = await db
        .select({ nickname: users.nickname, amount: bets.amount, createdAt: bets.createdAt })
        .from(bets)
        .innerJoin(users, eq(users.id, bets.userId))
        .where(and(eq(bets.isFake, false), gte(bets.amount, 20000)))
        .orderBy(desc(bets.amount))
        .limit(10);
      const hotNodes = await db
        .select({
          nickname: users.nickname,
          volume: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(bets)
        .innerJoin(users, eq(users.id, bets.userId))
        .where(gte(bets.createdAt, new Date(Date.now() - 86400000)))
        .groupBy(users.nickname)
        .orderBy(desc(sql`sum(${bets.amount})`))
        .limit(10);
      return ok({ gaps, overrides, whales, hotNodes });
    }

    return Response.json({ ok: false, message: "未知指标" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
