import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import {
  errorResponse,
  ok,
  checkLoginRateLimit,
  recordLoginAttempt,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 从 Request 中提取客户端 IP */
function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * 用户登录
 * - bcrypt 密码验证
 * - IP 限流：15 分钟内失败 5 次锁定
 * - 登录成功更新 lastLoginAt
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      username?: string;
      password?: string;
    };

    if (!body.username || !body.password) {
      return errorResponse(new Error("请输入用户名和密码"));
    }

    // ===== 限流检查（先查，避免被暴力枚举） =====
    const rateLimit = await checkLoginRateLimit(ip);
    if (rateLimit.blocked) {
      await recordLoginAttempt(ip, body.username, false);
      return errorResponse(new Error("登录失败次数过多，请 15 分钟后再试"));
    }

    // 查找用户
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (!user) {
      await recordLoginAttempt(ip, body.username, false);
      return errorResponse(new Error("用户名或密码错误"));
    }

    if (user.status !== "active") {
      await recordLoginAttempt(ip, body.username, false);
      return errorResponse(new Error("账户已被禁用"));
    }

    // bcrypt 密码验证（恒定时间比较，防时序攻击）
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      await recordLoginAttempt(ip, body.username, false);
      return errorResponse(
        new Error(`用户名或密码错误，剩余尝试次数 ${rateLimit.remaining - 1} 次`)
      );
    }

    // 登录成功：记录成功尝试
    await recordLoginAttempt(ip, body.username, true);

    // 更新最后登录时间
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // 创建 session（7 天有效）
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
