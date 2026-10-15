import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, bets, ledgerEntries, rounds } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";
import { profitCurve, recentAchievements, userStats } from "@/lib/gamification";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ section: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { section } = await ctx.params;
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    if (section === "balance") {
      const rows = await db.select().from(accounts).where(eq(accounts.userId, user.id)).limit(1);
      return ok({ balance: rows[0]?.balance ?? 0, frozen: rows[0]?.frozen ?? 0 });
    }
    if (section === "bets") {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 40), 200);
      const rows = await db
        .select({
          id: bets.id,
          roundId: bets.roundId,
          roundCode: rounds.code,
          side: bets.side,
          amount: bets.amount,
          payout: bets.payout,
          status: bets.status,
          result: rounds.result,
          createdAt: bets.createdAt,
          settleTime: rounds.settleTime,
        })
        .from(bets)
        .innerJoin(rounds, eq(rounds.id, bets.roundId))
        .where(and(eq(bets.userId, user.id), eq(bets.isFake, false)))
        .orderBy(desc(bets.id))
        .limit(limit);
      return ok(rows);
    }
    if (section === "ledger") {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 60), 300);
      const rows = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.userId, user.id))
        .orderBy(desc(ledgerEntries.id))
        .limit(limit);
      return ok(rows);
    }
    if (section === "achievements") {
      const rows = await recentAchievements(user.id);
      return ok(rows);
    }
    if (section === "curve") {
      const days = Math.min(Number(url.searchParams.get("days") ?? 30), 90);
      const rows = await profitCurve(user.id, days);
      return ok(rows);
    }
    if (section === "stats") {
      const stats = await userStats(user.id);
      const streak = await db
        .select({
          streak: sql<number>`count(*)::int`,
        })
        .from(bets)
        .where(and(eq(bets.userId, user.id), eq(bets.status, "won")));
      return ok({ ...stats, wonBets: streak[0]?.streak ?? 0 });
    }
    return Response.json({ ok: false, message: "未知分区" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
