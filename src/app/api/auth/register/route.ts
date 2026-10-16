import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { errorResponse, ok, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 用户注册
 * 用户名 + 密码注册，密码使用 scrypt 哈希
 * 用户创建 + 账户初始化在同一事务中，防止孤儿用户
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

    const username = body.username;
    const password = body.password;

    // 检查用户名是否已存在
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing.length > 0) {
      return errorResponse(new Error("用户名已被注册"));
    }

    // 加密密码（统一使用 lib/auth 的 scrypt）
    const hashedPassword = hashPassword(password);

    // 创建用户 + 初始化账户（同一事务，防止孤儿用户）
    const [user] = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          username,
          passwordHash: hashedPassword,
          nickname: username,
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
