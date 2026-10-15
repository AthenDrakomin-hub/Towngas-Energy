import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 获取通知列表 */
export async function GET() {
  try {
    const user = await requireUser();

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCount = list.filter((n) => !n.isRead).length;

    return ok({ list, unreadCount });
  } catch (err) {
    return errorResponse(err);
  }
}

/** 标记已读 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { id?: number; all?: boolean };

    if (body.all) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
    } else if (body.id) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, body.id), eq(notifications.userId, user.id)));
    }

    return ok({ message: "已标记已读" });
  } catch (err) {
    return errorResponse(err);
  }
}
