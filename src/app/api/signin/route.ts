import { errorResponse, ok, requireUser } from "@/lib/auth";
import { dailySignin } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser();
    try {
      const result = await dailySignin(user.id);
      return ok(result);
    } catch (err) {
      return Response.json(
        { ok: false, code: "SIGNIN", message: err instanceof Error ? err.message : "签到失败" },
        { status: 400 },
      );
    }
  } catch (err) {
    return errorResponse(err);
  }
}
