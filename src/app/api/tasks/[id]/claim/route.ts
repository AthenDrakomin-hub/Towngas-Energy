import { errorResponse, ok, requireUser } from "@/lib/auth";
import { claimTask } from "@/lib/gamification";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    try {
      return ok(await claimTask(user.id, id));
    } catch (err) {
      return Response.json(
        { ok: false, code: "TASK", message: err instanceof Error ? err.message : "领取失败" },
        { status: 400 },
      );
    }
  } catch (err) {
    return errorResponse(err);
  }
}
