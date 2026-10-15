import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { errorLogs } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 获取错误日志列表 */
export async function GET() {
  try {
    await requireScope("logs");

    const list = await db
      .select()
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt))
      .limit(100);

    return ok({ list });
  } catch (err) {
    return errorResponse(err);
  }
}
