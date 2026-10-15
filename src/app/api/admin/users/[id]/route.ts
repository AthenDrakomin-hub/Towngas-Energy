import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, bets, ledgerEntries, rounds, sessions, users } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { hashPassword, revokeAllSessions } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";
import { applyLedger } from "@/lib/ledger";
import { logTerminal } from "@/lib/logs";
import { userStats } from "@/lib/gamification";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireScope("users");
    const { id } = await ctx.params;
    const userId = Number(id);
    const row = (
      await db
        .select({
          id: users.id,
          username: users.username,
          nickname: users.nickname,
          role: users.role,
          status: users.status,
          tags: users.tags,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
          lastSeenAt: users.lastSeenAt,
          balance: accounts.balance,
          frozen: accounts.frozen,
          lifetimeGrant: accounts.lifetimeGrant,
        })
        .from(users)
        .leftJoin(accounts, eq(accounts.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1)
    )[0];
    if (!row) return Response.json({ ok: false, message: "节点不存在" }, { status: 404 });
    const stats = await userStats(userId);
    const recentBets = await db
      .select({
        id: bets.id,
        roundCode: rounds.code,
        side: bets.side,
        amount: bets.amount,
        payout: bets.payout,
        status: bets.status,
        createdAt: bets.createdAt,
      })
      .from(bets)
      .innerJoin(rounds, eq(rounds.id, bets.roundId))
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.id))
      .limit(20);
    const recentLedger = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.userId, userId))
      .orderBy(desc(ledgerEntries.id))
      .limit(20);
    const loginSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
      .limit(10);
    const timeline = await db
      .select({ day: sql<string>`to_char(${bets.createdAt}, 'MM-DD HH24:mi')`, count: sql<number>`count(*)::int` })
      .from(bets)
      .where(eq(bets.userId, userId))
      .groupBy(sql`to_char(${bets.createdAt}, 'MM-DD HH24:mi')`)
      .orderBy(sql`to_char(${bets.createdAt}, 'MM-DD HH24:mi') desc`)
      .limit(12);
    return ok({ user: row, stats, recentBets, recentLedger, loginSessions, timeline });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const admin = await requireScope("users");
    const { id } = await ctx.params;
    const userId = Number(id);
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      amount?: number;
      remark?: string;
      tags?: string[];
      note?: string;
    };
    const action = body.action ?? "";
    const target = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!target) return Response.json({ ok: false, message: "节点不存在" }, { status: 404 });

    switch (action) {
      case "adjust-points": {
        const amount = Math.round(Number(body.amount ?? 0));
        if (!amount) return Response.json({ ok: false, message: "调整数量不能为 0" }, { status: 400 });
        const balance = await applyLedger({
          userId,
          amount,
          type: "adjust",
          refId: `admin:${admin.id}`,
          remark: body.remark || `管理端积分调整（${admin.nickname}）`,
        });
        await writeAdminLog(admin, "adjust-points", "user", userId, { amount, balance });
        return ok({ balance });
      }
      case "ban":
        await db.update(users).set({ status: "banned" }).where(eq(users.id, userId));
        await revokeAllSessions(userId);
        await writeAdminLog(admin, "ban", "user", userId, {});
        await logTerminal("warn", "控制台", `节点 ${target.username} 已被冻结`);
        return ok({ status: "banned" });
      case "unban":
        await db.update(users).set({ status: "active" }).where(eq(users.id, userId));
        await writeAdminLog(admin, "unban", "user", userId, {});
        return ok({ status: "active" });
      case "shadow-ban":
        await db.update(users).set({ status: "shadow_banned" }).where(eq(users.id, userId));
        await writeAdminLog(admin, "shadow-ban", "user", userId, {});
        await logTerminal("warn", "控制台", `节点 ${target.username} 已进入影子封禁（客户端无感知）`);
        return ok({ status: "shadow_banned" });
      case "kick":
        await revokeAllSessions(userId);
        await writeAdminLog(admin, "kick", "user", userId, {});
        return ok({ kicked: true });
      case "reset-password": {
        const pwd = `CNX@${Math.floor(Math.random() * 900000 + 100000)}`;
        await db.update(users).set({ passwordHash: hashPassword(pwd) }).where(eq(users.id, userId));
        await writeAdminLog(admin, "reset-password", "user", userId, {});
        return ok({ password: pwd });
      }
      case "tags":
        await db.update(users).set({ tags: body.tags ?? [] }).where(eq(users.id, userId));
        await writeAdminLog(admin, "tags", "user", userId, { tags: body.tags ?? [] });
        return ok({ tags: body.tags ?? [] });
      case "cooldown":
        await db.update(users).set({ status: "cooldown" }).where(eq(users.id, userId));
        await writeAdminLog(admin, "cooldown", "user", userId, { note: body.note ?? "" });
        return ok({ status: "cooldown" });
      default:
        return Response.json({ ok: false, message: "未知操作" }, { status: 400 });
    }
  } catch (err) {
    return errorResponse(err);
  }
}
