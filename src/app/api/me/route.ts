import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";
import { userStats } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const stats = await userStats(user.id);
    return ok({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      status: user.status,
      tags: user.tags,
      balance: user.balance,
      frozen: user.frozen,
      stats,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { nickname?: string; avatar?: string };
    const patch: { nickname?: string; avatar?: string } = {};
    if (typeof body.nickname === "string" && body.nickname.trim()) patch.nickname = body.nickname.trim().slice(0, 24);
    if (typeof body.avatar === "string") patch.avatar = body.avatar.slice(0, 8);
    if (Object.keys(patch).length) {
      await db.update(users).set(patch).where(eq(users.id, user.id));
    }
    return ok({ updated: Object.keys(patch) });
  } catch (err) {
    return errorResponse(err);
  }
}
