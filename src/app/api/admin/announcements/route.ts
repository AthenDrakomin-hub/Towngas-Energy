import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";
import { logTerminal } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireScope("content");
    return ok(await db.select().from(announcements).orderBy(desc(announcements.id)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireScope("content");
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      content?: string;
      type?: string;
      status?: string;
    };
    if (!body.title || !body.content) return Response.json({ ok: false, message: "标题与内容必填" }, { status: 400 });
    const rows = await db
      .insert(announcements)
      .values({
        title: body.title.slice(0, 80),
        content: body.content.slice(0, 2000),
        type: body.type ?? "info",
        status: body.status ?? "published",
        publishedAt: body.status === "draft" ? null : new Date(),
      })
      .returning();
    await writeAdminLog(admin, "announcement-create", "announcement", rows[0].id, { title: body.title });
    await logTerminal("info", "内容", `公告已发布 | ${body.title}`);
    return ok(rows[0]);
  } catch (err) {
    return errorResponse(err);
  }
}
