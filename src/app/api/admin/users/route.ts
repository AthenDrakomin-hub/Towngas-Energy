import { desc, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 获取用户列表 */
export async function GET(req: Request) {
  try {
    await requireScope("users");

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 20);
    const keyword = searchParams.get("keyword") || "";

    let where = undefined;
    if (keyword) {
      where = or(
        like(users.username, `%${keyword}%`),
      );
    }

    const list = await db
      .select({
        id: users.id,
        username: users.username,
        nickname: users.nickname,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        balance: accounts.balance,
      })
      .from(users)
      .leftJoin(accounts, eq(accounts.userId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return ok({
      list,
      page,
      pageSize,
      total: list.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** 更新用户状态（禁用/启用） */
export async function PATCH(req: Request) {
  try {
    await requireScope("users");

    const body = (await req.json().catch(() => ({}))) as {
      userId?: number;
      status?: string;
    };

    if (!body.userId || !body.status) {
      return errorResponse(new Error("参数错误"));
    }

    await db
      .update(users)
      .set({ status: body.status })
      .where(eq(users.id, body.userId));

    return ok({ message: "用户状态已更新" });
  } catch (err) {
    return errorResponse(err);
  }
}
