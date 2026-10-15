import { desc } from "drizzle-orm";
import { db } from "@/db";
import { errorLogs } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 获取前端错误日志列表 */
export async function GET(req: Request) {
  try {
    await requireScope("users", req);

    const list = await db
      .select()
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt))
      .limit(200);

    return ok({ list });
  } catch (err) {
    return errorResponse(err);
  }
}
