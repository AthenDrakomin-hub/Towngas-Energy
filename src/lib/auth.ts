import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull, gte, count, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users, loginAttempts } from "@/db/schema";
import { hasScope } from "./constants";

export const SESSION_COOKIE = "cnx_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export type SessionUser = {
  id: number;
  username: string;
  nickname: string;
  role: string;
  status: string;
  tags: string[];
  balance: number;
  frozen: number;
  sessionId: string;
};

export async function createSession(userId: number, ip?: string, userAgent?: string) {
  const id = randomBytes(24).toString("hex");
  await db.insert(sessions).values({
    id,
    userId,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return id;
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionUser(token?: string | null): Promise<SessionUser | null> {
  const id = token ?? (await readSessionToken());
  if (!id) return null;
  const rows = await db
    .select({
      sessionId: sessions.id,
      id: users.id,
      username: users.username,
      nickname: users.nickname,
      role: users.role,
      status: users.status,
      tags: users.tags,
      balance: accounts.balance,
      frozen: accounts.frozen,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(accounts, eq(accounts.userId, users.id))
    .where(and(eq(sessions.id, id), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    sessionId: row.sessionId,
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    role: row.role,
    status: row.status,
    tags: row.tags ?? [],
    balance: row.balance ?? 0,
    frozen: row.frozen ?? 0,
  };
}

export async function revokeSession(token: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, token));
}

export async function revokeAllSessions(userId: number) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userId));
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "NEED_AUTH", "请先接入平台账号");
  if (user.status === "banned") throw new HttpError(403, "BANNED", "账号已被冻结");
  return user;
}

export async function requireScope(scope: string): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "user" || user.role === "bot" || !hasScope(user.role, scope)) {
    throw new HttpError(403, "NO_SCOPE", "当前角色无该控制台权限");
  }
  return user;
}

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return Response.json({ ok: false, code: err.code, message: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "UNKNOWN";
  return Response.json({ ok: false, code: "UNKNOWN", message }, { status: 500 });
}

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

// ==================== 登录限流 ====================

const LOGIN_MAX_ATTEMPTS = 5; // 15分钟内最多失败5次
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15分钟窗口

/** 检查登录限流：返回是否被阻止及剩余尝试次数 */
export async function checkLoginRateLimit(ip: string): Promise<{ blocked: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ip, ip), eq(loginAttempts.success, false), gte(loginAttempts.createdAt, windowStart)));

  const failedCount = result?.count ?? 0;
  const remaining = Math.max(0, LOGIN_MAX_ATTEMPTS - failedCount);
  return { blocked: failedCount >= LOGIN_MAX_ATTEMPTS, remaining };
}

/** 记录一次登录尝试 */
export async function recordLoginAttempt(ip: string, username: string | undefined, success: boolean, userAgent?: string) {
  await db.insert(loginAttempts).values({
    ip,
    username: username ?? null,
    success,
    userAgent: userAgent ?? null,
  });
}

/** 清理超过24小时的登录尝试记录（可定期调用） */
export async function cleanupOldLoginAttempts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.delete(loginAttempts).where(sql`${loginAttempts.createdAt} < ${cutoff}`);
}

/** 从请求中获取客户端 IP */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
