import { eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const admin = await requireScope("content");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      content?: string;
      type?: string;
      status?: string;
    };
    const patch: Record<string, unknown> = {};
    if (body.title) patch.title = body.title.slice(0, 80);
    if (body.content) patch.content = body.content.slice(0, 2000);
    if (body.type) patch.type = body.type;
    if (body.status) {
      patch.status = body.status;
      patch.publishedAt = body.status === "published" ? new Date() : null;
    }
    const rows = await db.update(announcements).set(patch).where(eq(announcements.id, Number(id))).returning();
    await writeAdminLog(admin, "announcement-update", "announcement", id, patch);
    return ok(rows[0] ?? null);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireScope("content");
    const { id } = await ctx.params;
    await db.delete(announcements).where(eq(announcements.id, Number(id)));
    await writeAdminLog(admin, "announcement-delete", "announcement", id, {});
    return ok({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
