import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { errorResponse, ok } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BCRYPT_ROUNDS = 10;

/**
 * 用户注册
 * - bcrypt 密码哈希（10 轮盐）
 * - 自动初始化账户余额为 0
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      username?: string;
      password?: string;
    };

    // 参数校验
    if (!body.username || !/^[a-zA-Z0-9_]{3,20}$/.test(body.username)) {
      return errorResponse(new Error("用户名格式错误：3-20位字母/数字/下划线"));
    }

    if (!body.password || body.password.length < 6) {
      return errorResponse(new Error("密码至少 6 位"));
    }

    // 密码强度基本检查（至少包含字母和数字）
    if (!/[a-zA-Z]/.test(body.password) || !/\d/.test(body.password)) {
      return errorResponse(new Error("密码需同时包含字母和数字"));
    }

    // 检查用户名是否已存在
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (existing.length > 0) {
      return errorResponse(new Error("用户名已被注册"));
    }

    // bcrypt 哈希密码
    const hashedPassword = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

    // 创建用户 + 初始化账户（同一事务，防止孤儿用户）
    const [user] = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          username: body.username,
          passwordHash: hashedPassword,
          nickname: body.username,
          role: "user",
          status: "active",
        })
        .returning({ id: users.id, username: users.username, role: users.role });

      await tx.insert(accounts).values({
        userId: newUser.id,
        balance: 0,
      });

      return [newUser];
    });

    return ok({
      message: "注册成功",
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
