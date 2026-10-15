import { eq, and, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, loginAttempts } from "@/db/schema";
import { hasScope } from "@/lib/constants";

const sqlCount = sql<number>`count(*)::int`;

// ===== 统一响应 =====
export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function errorResponse(err: unknown, init?: ResponseInit) {
  const message = err instanceof Error ? err.message : "服务器内部错误";
  return Response.json({ ok: false, message }, { status: 400, ...init });
}

// ===== 从请求中提取用户 =====
async function getSessionUser(req?: Request) {
  let token: string | null = null;
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }
  if (!token && req) {
    const cookie = req.headers.get("cookie");
    const match = cookie?.match(/(?:^|;\s*)session=([^;]+)/);
    if (match) token = match[1];
  }
  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, token))
    .limit(1);

  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user || null;
}

// ===== 用户端鉴权 =====
export async function requireUser(req?: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    throw new Error("未登录或登录已过期");
  }
  if (user.status !== "active") {
    throw new Error("账户已被禁用");
  }
  return user;
}

// ===== 管理端鉴权（按 scope） =====
export async function requireScope(scope: string, req?: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    throw new Error("未登录或登录已过期");
  }
  if (!hasScope(user.role, scope)) {
    throw new Error("权限不足");
  }
  return user;
}

// ===== 登录限流 =====
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

export async function checkLoginRateLimit(ip: string): Promise<{ blocked: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);

  const failed = await db
    .select({ count: sqlCount })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, windowStart)
      )
    );

  const failedCount = Number(failed[0]?.count ?? 0);
  return {
    blocked: failedCount >= LOGIN_MAX_ATTEMPTS,
    remaining: Math.max(0, LOGIN_MAX_ATTEMPTS - failedCount),
  };
}

export async function recordLoginAttempt(ip: string, username: string | undefined, success: boolean) {
  await db.insert(loginAttempts).values({ ip, username, success });
}

export async function cleanupOldLoginAttempts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, cutoff));
}
