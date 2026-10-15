import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { achievements } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireScope("content");
    return ok(await db.select().from(achievements).orderBy(desc(achievements.id)));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireScope("content");
    const body = (await req.json().catch(() => ({}))) as {
      code?: string;
      name?: string;
      description?: string;
      icon?: string;
      metric?: string;
      op?: string;
      value?: number;
      reward?: number;
    };
    if (!body.code || !body.name) return Response.json({ ok: false, message: "编码与名称必填" }, { status: 400 });
    const rows = await db
      .insert(achievements)
      .values({
        code: body.code,
        name: body.name,
        description: body.description ?? "",
        icon: body.icon ?? "◎",
        condition: { metric: body.metric ?? "rounds", op: body.op ?? ">=", value: Number(body.value ?? 1) },
        reward: Math.round(Number(body.reward ?? 0)),
      })
      .onConflictDoNothing({ target: achievements.code })
      .returning();
    await writeAdminLog(admin, "achievement-create", "achievement", body.code, {});
    return ok(rows[0] ?? null);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireScope("content");
    const body = (await req.json().catch(() => ({}))) as { id?: number; reward?: number; name?: string; description?: string };
    if (!body.id) return Response.json({ ok: false, message: "缺少 ID" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof body.reward === "number") patch.reward = Math.round(body.reward);
    if (body.name) patch.name = body.name;
    if (body.description) patch.description = body.description;
    const rows = await db.update(achievements).set(patch).where(eq(achievements.id, body.id)).returning();
    await writeAdminLog(admin, "achievement-update", "achievement", body.id, patch);
    return ok(rows[0] ?? null);
  } catch (err) {
    return errorResponse(err);
  }
}
