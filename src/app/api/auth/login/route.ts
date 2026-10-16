import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  errorResponse,
  ok,
  verifyPassword,
  createSession,
  checkLoginRateLimit,
  recordLoginAttempt,
  getClientIp,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 用户登录
 * 用户名 + 密码登录，返回 session token
 * 含 IP 限流：15分钟内失败5次锁定
 * 密码哈希兼容 scrypt（新版）和 SHA256+salt（旧版）
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  try {
    // ===== 限流检查（先查，避免被暴力枚举） =====
    const rateLimit = await checkLoginRateLimit(ip);
    if (rateLimit.blocked) {
      await recordLoginAttempt(ip, undefined, false, userAgent);
      return errorResponse(new Error("登录失败次数过多，请 15 分钟后再试"));
    }

    const body = (await req.json().catch(() => ({}))) as {
      username?: string;
      password?: string;
    };

    if (!body.username || !body.password) {
      return errorResponse(new Error("请输入用户名和密码"));
    }

    // 查找用户
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (!user) {
      await recordLoginAttempt(ip, body.username, false, userAgent);
      return errorResponse(new Error("用户不存在"));
    }

    if (user.status !== "active") {
      await recordLoginAttempt(ip, body.username, false, userAgent);
      return errorResponse(new Error("账户已被禁用"));
    }

    // 验证密码（兼容 scrypt 和 SHA256）
    const valid = verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      await recordLoginAttempt(ip, body.username, false, userAgent);
      return errorResponse(new Error(`密码错误，还可尝试 ${rateLimit.remaining - 1} 次`));
    }

    // 登录成功：记录成功尝试 + 更新最后登录时间
    await recordLoginAttempt(ip, body.username, true, userAgent);
    if ("lastLoginAt" in user) {
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    }

    // 创建 session（统一使用 lib/auth 的 createSession）
    const token = await createSession(user.id, ip, userAgent);

    return ok({
      message: "登录成功",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
