import { createHash, randomBytes, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { errorResponse, ok, checkLoginRateLimit, recordLoginAttempt, getClientIp } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 验证密码（兼容现有 SHA256+salt 格式） */
function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verifyHash = createHash("sha256").update(salt + password).digest("hex");
  return hash === verifyHash;
}

/**
 * 用户登录
 * 用户名 + 密码登录，返回 session token
 * 含 IP 限流：15分钟内失败5次锁定
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

    // 验证密码
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

    // 创建 session
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天有效

    await db.insert(sessions).values({
      id: token,
      userId: user.id,
      expiresAt,
    });

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
