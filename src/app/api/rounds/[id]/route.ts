import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bets, roundSettlements, rounds, users } from "@/db/schema";
import { errorResponse, ok } from "@/lib/auth";
import { roundSnapshot, tickEngine } from "@/lib/engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await tickEngine();
    const { id } = await ctx.params;
    const roundId = Number(id);
    if (!Number.isFinite(roundId)) return Response.json({ ok: false, message: "无效周期" }, { status: 400 });
    const snapshot = await roundSnapshot(roundId);
    if (!snapshot) return Response.json({ ok: false, message: "周期不存在" }, { status: 404 });
    const settlement = await db.select().from(roundSettlements).where(eq(roundSettlements.roundId, roundId)).limit(1);
    const distribution = await db
      .select({
        side: bets.side,
        stake: sql<number>`coalesce(sum(${bets.amount}),0)::int`,
        nodes: sql<number>`count(*)::int`,
      })
      .from(bets)
      .innerJoin(users, eq(users.id, bets.userId))
      .where(and(eq(bets.roundId, roundId), eq(bets.isFake, false)))
      .groupBy(bets.side);
    const topNodes = await db
      .select({ nickname: users.nickname, side: bets.side, amount: bets.amount, status: bets.status })
      .from(bets)
      .innerJoin(users, eq(users.id, bets.userId))
      .where(and(eq(bets.roundId, roundId), eq(bets.isFake, false)))
      .orderBy(sql`${bets.amount} desc`)
      .limit(10);
    const roundRow = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
    return ok({ round: snapshot, settlement: settlement[0] ?? null, distribution, topNodes, row: roundRow[0] ?? null });
  } catch (err) {
    return errorResponse(err);
  }
}
