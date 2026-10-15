import { db } from "@/db";
import { errorLogs } from "@/db/schema";
import { errorResponse, ok } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 上报前端错误 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      message?: string;
      stack?: string;
      url?: string;
      userId?: number;
    };

    if (!body.message) {
      return errorResponse(new Error("缺少错误信息"));
    }

    await db.insert(errorLogs).values({
      userId: body.userId || null,
      message: body.message.slice(0, 1000),
      stack: body.stack?.slice(0, 5000),
      url: body.url?.slice(0, 500) || "/",
      userAgent: req.headers.get("user-agent")?.slice(0, 500),
    });

    return ok({ message: "错误已记录" });
  } catch (err) {
    return errorResponse(err);
  }
}
