import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, bets, ledgerEntries, rounds, users } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";
import { getConfig, setConfig, type PlatformConfig } from "@/lib/config";
import { applyLedger } from "@/lib/ledger";
import { logTerminal } from "@/lib/logs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ action: string }> };

const POINT_KEYS: (keyof PlatformConfig)[] = [
  "newPlayerGrant",
  "dailySigninReward",
  "minBet",
  "maxBetPerRound",
  "maxDailyStake",
  "rakeRate",
  "sessionReminderMinutes",
  "cooldownDefaultMinutes",
];

export async function GET(_req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    await requireScope("points");
    if (action === "overview") {
      const [supply] = await db
        .select({
          total: sql<number>`coalesce(sum(${accounts.balance}),0)::int`,
          holders: sql<number>`count(*)::int`,
        })
        .from(accounts);
      const [circulating] = await db
        .select({
          open: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
          openBets: sql<number>`count(*)::int`,
        })
        .from(bets)
        .where(eq(bets.status, "open"));
      const [rake] = await db
        .select({ rake: sql<number>`coalesce(sum(${ledgerEntries.amount}),0)::int` })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.type, "rake"));
      const [grants] = await db
        .select({ granted: sql<number>`coalesce(sum(${ledgerEntries.amount}),0)::int` })
        .from(ledgerEntries)
        .where(gte(ledgerEntries.amount, 0));
      const topHolders = await db
        .select({ nickname: users.nickname, username: users.username, balance: accounts.balance, role: users.role })
        .from(accounts)
        .innerJoin(users, eq(users.id, accounts.userId))
        .orderBy(desc(accounts.balance))
        .limit(12);
      const daily = await db
        .select({
          day: sql<string>`to_char(${ledgerEntries.createdAt}, 'MM-DD')`,
          grants: sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.type} in ('grant','signin','task','adjust')),0)::int`,
          rake: sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.type} = 'rake'),0)::int`,
        })
        .from(ledgerEntries)
        .groupBy(sql`to_char(${ledgerEntries.createdAt}, 'MM-DD')`)
        .orderBy(sql`to_char(${ledgerEntries.createdAt}, 'MM-DD')`)
        .limit(14);
      return ok({
        supply: supply ?? { total: 0, holders: 0 },
        inPlay: circulating ?? { open: 0, openBets: 0 },
        rake: rake?.rake ?? 0,
        granted: grants?.granted ?? 0,
        inflation: supply?.total ? ((rake?.rake ?? 0) / supply.total) * -1 : 0,
        topHolders,
        daily,
        config: await getConfig(true),
      });
    }
    return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    const admin = await requireScope("points");
    const body = (await req.json().catch(() => ({}))) as {
      usernames?: string[];
      amount?: number;
      remark?: string;
      config?: Partial<PlatformConfig>;
    };
    if (action === "batch-grant") {
      const names = Array.isArray(body.usernames) ? body.usernames : [];
      const amount = Math.round(Number(body.amount ?? 0));
      if (!names.length || !amount) return Response.json({ ok: false, message: "参数不足" }, { status: 400 });
      const targets = await db.select().from(users).where(sql`${users.username} = any(${names})`);
      for (const target of targets) {
        await applyLedger({
          userId: target.id,
          amount,
          type: "grant",
          refId: `admin:${admin.id}`,
          remark: body.remark || `批量发放（${admin.nickname}）`,
        });
      }
      await writeAdminLog(admin, "batch-grant", "points", names.join(","), { amount, count: targets.length });
      return ok({ affected: targets.length, amount });
    }
    if (action === "deduct") {
      const amount = -Math.abs(Math.round(Number(body.amount ?? 0)));
      const names = Array.isArray(body.usernames) ? body.usernames : [];
      if (!names.length || !amount) return Response.json({ ok: false, message: "参数不足" }, { status: 400 });
      const targets = await db.select().from(users).where(sql`${users.username} = any(${names})`);
      for (const target of targets) {
        await applyLedger({
          userId: target.id,
          amount,
          type: "adjust",
          refId: `admin:${admin.id}`,
          remark: body.remark || `积分回收（${admin.nickname}）`,
        });
      }
      await writeAdminLog(admin, "points-deduct", "points", names.join(","), { amount, count: targets.length });
      return ok({ affected: targets.length, amount });
    }
    if (action === "config") {
      const patch: Partial<PlatformConfig> = {};
      for (const key of POINT_KEYS) {
        if (body.config && key in body.config) {
          (patch as Record<string, unknown>)[key] = (body.config as Record<string, unknown>)[key];
        }
      }
      const next = await setConfig(patch);
      await writeAdminLog(admin, "points-config", "config", "points", patch as Record<string, unknown>);
      await logTerminal("warn", "控制台", `积分参数已更新 | ${JSON.stringify(patch)}`);
      return ok(next);
    }
    return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
