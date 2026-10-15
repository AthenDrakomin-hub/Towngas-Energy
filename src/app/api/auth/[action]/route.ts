import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  createSession,
  errorResponse,
  getSessionUser,
  hashPassword,
  ok,
  revokeSession,
  verifyPassword,
} from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { getConfig } from "@/lib/config";
import { applyLedger } from "@/lib/ledger";
import { ensureDailyTasks } from "@/lib/gamification";
import { logTerminal } from "@/lib/logs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ action: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  await ensureBootstrap();
  try {
    if (action === "login") {
      const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
      const username = String(body.username ?? "").trim();
      const password = String(body.password ?? "");
      const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
      const user = rows[0];
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return Response.json({ ok: false, code: "BAD_AUTH", message: "节点编号或访问密钥错误" }, { status: 401 });
      }
      if (user.status === "banned") {
        return Response.json({ ok: false, code: "BANNED", message: "账号已被冻结" }, { status: 403 });
      }
      const hdrs = await headers();
      const token = await createSession(user.id, hdrs.get("x-forwarded-for") ?? undefined, hdrs.get("user-agent") ?? undefined);
      await db.update(users).set({ lastLoginAt: new Date(), lastSeenAt: new Date() }).where(eq(users.id, user.id));
      await ensureDailyTasks(user.id);
      const store = await cookies();
      store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      await logTerminal("info", "节点", `节点 ${user.username} 接入平台 | 角色=${user.role}`);
      return ok({ id: user.id, nickname: user.nickname, role: user.role, username: user.username });
    }

    if (action === "register") {
      const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string; nickname?: string };
      const username = String(body.username ?? "").trim();
      const password = String(body.password ?? "");
      const nickname = String(body.nickname ?? "").trim() || `生态节点·${username}`;
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return Response.json({ ok: false, code: "BAD_NAME", message: "节点编号需为 3-20 位字母数字下划线" }, { status: 400 });
      }
      if (password.length < 6) {
        return Response.json({ ok: false, code: "BAD_PASS", message: "访问密钥至少 6 位" }, { status: 400 });
      }
      const exists = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (exists.length) {
        return Response.json({ ok: false, code: "DUP", message: "节点编号已存在" }, { status: 409 });
      }
      const created = await db
        .insert(users)
        .values({ username, passwordHash: hashPassword(password), nickname, role: "user", tags: ["自助接入"] })
        .returning({ id: users.id });
      const cfg = await getConfig();
      await applyLedger({
        userId: created[0].id,
        amount: cfg.newPlayerGrant,
        type: "grant",
        refId: "register:grant",
        remark: "新节点接入初始碳积分（虚拟积分，仅供娱乐）",
      });
      await ensureDailyTasks(created[0].id);
      const hdrs = await headers();
      const token = await createSession(created[0].id, hdrs.get("x-forwarded-for") ?? undefined, hdrs.get("user-agent") ?? undefined);
      const store = await cookies();
      store.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      await logTerminal("info", "节点", `新节点 ${username} 完成注册 | 初始积分=${cfg.newPlayerGrant}`);
      return ok({ id: created[0].id, nickname, role: "user", username });
    }

    if (action === "logout") {
      const token = (await cookies()).get(SESSION_COOKIE)?.value;
      if (token) await revokeSession(token);
      const store = await cookies();
      store.delete(SESSION_COOKIE);
      return ok({ loggedOut: true });
    }

    if (action === "refresh") {
      const user = await getSessionUser();
      if (!user) return Response.json({ ok: false, code: "NEED_AUTH", message: "会话已失效" }, { status: 401 });
      await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
      return ok({ id: user.id, nickname: user.nickname, role: user.role, balance: user.balance });
    }

    return Response.json({ ok: false, code: "NO_ACTION", message: "未知操作" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
