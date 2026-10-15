import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  bets,
  carResults,
  ledgerEntries,
  resultOverrides,
  roundSettlements,
  rounds,
  signals,
  users,
} from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";
import { getConfig } from "@/lib/config";
import { settleRound } from "@/lib/engine";
import { logTerminal } from "@/lib/logs";
import { analyzeCar } from "@/lib/settlement";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** 周期回放：完整数据流 + 投资份额分布 */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireScope("rounds");
    const { id } = await ctx.params;
    const roundId = Number(id);
    const round = (await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
    if (!round) return Response.json({ ok: false, message: "周期不存在" }, { status: 404 });
    const settlement = (
      await db.select().from(roundSettlements).where(eq(roundSettlements.roundId, roundId)).limit(1)
    )[0];
    const window = await db
      .select()
      .from(carResults)
      .where(and(gte(carResults.onlinetime, round.startTime), lt(carResults.onlinetime, round.settleTime)))
      .orderBy(desc(carResults.onlinetime));
    const positions = await db
      .select({
        nickname: users.nickname,
        username: users.username,
        side: bets.side,
        amount: bets.amount,
        payout: bets.payout,
        status: bets.status,
        isFake: bets.isFake,
      })
      .from(bets)
      .innerJoin(users, eq(users.id, bets.userId))
      .where(eq(bets.roundId, roundId))
      .orderBy(desc(bets.amount));
    const signal = (await db.select().from(signals).where(eq(signals.roundId, roundId)).limit(1))[0] ?? null;
    const flow = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.refId, `round:${roundId}`))
      .orderBy(desc(ledgerEntries.id))
      .limit(60);
    return ok({
      round,
      settlement: settlement ?? null,
      window,
      analysis: round.settleCar ? analyzeCar(round.settleCar) : null,
      positions,
      signal,
      flow,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** 结果覆盖（优先级最高） */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const admin = await requireScope("results");
    const { id } = await ctx.params;
    const roundId = Number(id);
    const body = (await req.json().catch(() => ({}))) as { direction?: string; note?: string; resettle?: boolean };
    const direction = body.direction === "up" || body.direction === "down" || body.direction === "draw" ? body.direction : null;
    if (!direction) return Response.json({ ok: false, message: "无效结果" }, { status: 400 });
    const round = (await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1))[0];
    if (!round) return Response.json({ ok: false, message: "周期不存在" }, { status: 404 });

    await db
      .update(rounds)
      .set({ result: direction, resultSource: "admin_override", settleCar: round.settleCar ?? null })
      .where(eq(rounds.id, roundId));
    await db
      .insert(roundSettlements)
      .values({
        roundId,
        windowStart: round.startTime,
        windowEnd: round.settleTime,
        settlementCar: round.settleCar ?? null,
        result: direction,
        resultSource: "admin_override",
      })
      .onConflictDoNothing();
    if (body.resettle !== false) {
      await db.update(rounds).set({ status: "locked" }).where(eq(rounds.id, roundId));
      await settleRound({ ...round, status: "locked", result: null, resultSource: null }, await getConfig(), true);
    }
    await writeAdminLog(admin, "override-result", "round", round.code, { direction, note: body.note ?? "" });
    await logTerminal("warn", "控制台", `管理端覆盖周期 ${round.code} 结果 → ${direction}`);
    return ok({ roundId, direction });
  } catch (err) {
    return errorResponse(err);
  }
}
