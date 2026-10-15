import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bets, resultOverrides, rounds, users } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { getConfig } from "@/lib/config";
import { currentRoundSnapshot, ensureRoundForWindow, settleRound, tickEngine, windowBounds } from "@/lib/engine";
import { applyLedger } from "@/lib/ledger";
import { logTerminal } from "@/lib/logs";
import { writeAdminLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ action: string }> };

async function currentRoundRow() {
  const { start } = windowBounds();
  const cfg = await getConfig();
  return ensureRoundForWindow(start, cfg);
}

export async function GET(_req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    await ensureBootstrap();
    await requireScope("rounds");
    if (action === "state") {
      await tickEngine();
      const round = await currentRoundRow();
      const snapshot = await currentRoundSnapshot();
      const openBets = await db
        .select({
          nickname: users.nickname,
          side: bets.side,
          amount: bets.amount,
          createdAt: bets.createdAt,
          isFake: bets.isFake,
        })
        .from(bets)
        .innerJoin(users, eq(users.id, bets.userId))
        .where(eq(bets.roundId, round.id))
        .orderBy(desc(bets.id))
        .limit(40);
      const override = await db
        .select()
        .from(resultOverrides)
        .where(eq(resultOverrides.roundCode, round.code))
        .orderBy(desc(resultOverrides.id))
        .limit(1);
      return ok({ round: snapshot, openBets, pendingOverride: override[0] ?? null, config: await getConfig() });
    }
    return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    await ensureBootstrap();
    const admin = await requireScope("rounds");
    const round = await currentRoundRow();
    const cfg = await getConfig();

    if (action === "force-open") {
      const now = new Date();
      await db
        .update(rounds)
        .set({
          status: "betting",
          lockTime: new Date(now.getTime() + cfg.bettingWindowSec * 1000),
          settleTime: new Date(now.getTime() + cfg.roundDurationSec * 1000),
        })
        .where(eq(rounds.id, round.id));
      await writeAdminLog(admin, "force-open", "round", round.code, { roundId: round.id });
      await logTerminal("warn", "控制台", `管理端强制开盘 | 周期 ${round.code}`);
    } else if (action === "force-lock") {
      await db.update(rounds).set({ status: "locked", lockTime: new Date() }).where(eq(rounds.id, round.id));
      await writeAdminLog(admin, "force-lock", "round", round.code, { roundId: round.id });
      await logTerminal("warn", "控制台", `管理端强制锁定 | 周期 ${round.code}`);
    } else if (action === "force-settle") {
      await db.update(rounds).set({ settleTime: new Date(), status: "locked" }).where(eq(rounds.id, round.id));
      const fresh = (await db.select().from(rounds).where(eq(rounds.id, round.id)).limit(1))[0];
      const outcome = await settleRound(fresh, cfg, true);
      await writeAdminLog(admin, "force-settle", "round", round.code, { ...outcome, roundId: round.id });
    } else if (action === "cancel") {
      const open = await db.select().from(bets).where(eq(bets.roundId, round.id));
      for (const bet of open) {
        if (bet.status !== "open" || bet.isFake) continue;
        await applyLedger({
          userId: bet.userId,
          amount: bet.amount,
          type: "refund",
          refId: `round:${round.id}`,
          remark: `周期 ${round.code} 管理端取消，退还投资份额`,
        });
        await db.update(bets).set({ status: "refunded", payout: bet.amount }).where(eq(bets.id, bet.id));
      }
      await db
        .update(rounds)
        .set({ status: "cancelled", result: "void", resultSource: "cancelled" })
        .where(eq(rounds.id, round.id));
      await writeAdminLog(admin, "cancel-round", "round", round.code, { refunded: open.length });
    } else {
      return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
    }

    await tickEngine(true);
    return ok({ round: await currentRoundSnapshot() });
  } catch (err) {
    return errorResponse(err);
  }
}
