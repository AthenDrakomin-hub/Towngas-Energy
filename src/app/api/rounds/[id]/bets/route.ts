import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, ledgerEntries } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";
import { placeBet, roundSnapshot, tickEngine } from "@/lib/engine";
import { bumpTask, checkAchievements } from "@/lib/gamification";
import { getConfig } from "@/lib/config";
import { estimateRatio } from "@/lib/settlement";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    await tickEngine();
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { side?: string; amount?: number };
    const side = body.side === "down" ? "down" : body.side === "up" ? "up" : null;
    if (!side) return Response.json({ ok: false, message: "请选择投资份额方向" }, { status: 400 });
    const amount = Math.floor(Number(body.amount ?? 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ ok: false, message: "投资份额数量无效" }, { status: 400 });
    }

    // ===== 先扣钱包余额 =====
    const [account] = await db.select().from(accounts).where(eq(accounts.userId, user.id));
    if (!account || account.balance < amount) {
      return Response.json({
        ok: false,
        code: "INSUFFICIENT_BALANCE",
        message: `余额不足，当前余额 ¥${account?.balance || 0}，需要 ¥${amount}`,
      }, { status: 400 });
    }

    // 扣钱包余额
    const newBalance = account.balance - amount;
    await db.update(accounts).set({ balance: newBalance }).where(eq(accounts.userId, user.id));

    // 记录流水
    await db.insert(ledgerEntries).values({
      userId: user.id,
      amount: -amount,
      type: "bet",
      refId: `round_${id}`,
      balanceAfter: newBalance,
      remark: `游戏投资 ¥${amount}`,
    });

    try {
      const result = await placeBet({ userId: user.id, roundId: Number(id), side, amount });
      await bumpTask(user.id, "daily_stake_3", 1);
      await bumpTask(user.id, "daily_rounds_5", 1);
      await checkAchievements([user.id]);
      const snapshot = await roundSnapshot(Number(id), user.id);
      const cfg = await getConfig();
      const pool = (snapshot?.upPool ?? 0) + (snapshot?.downPool ?? 0);
      const sidePool = side === "up" ? snapshot?.upPool ?? 0 : snapshot?.downPool ?? 0;
      return ok({
        betId: result.betId,
        shadow: result.shadow,
        estimatedRatio: estimateRatio(pool, sidePool, snapshot?.rakeRate ?? cfg.rakeRate),
        snapshot,
        balance: newBalance,
      });
    } catch (err) {
      // 投资失败，退回余额
      await db.update(accounts).set({ balance: account.balance }).where(eq(accounts.userId, user.id));
      return Response.json(
        { ok: false, code: "BET_REJECTED", message: err instanceof Error ? err.message : "投资份额建立失败" },
        { status: 400 },
      );
    }
  } catch (err) {
    return errorResponse(err);
  }
}
