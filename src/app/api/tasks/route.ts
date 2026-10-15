import { errorResponse, ok, requireUser } from "@/lib/auth";
import { listTasks } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listTasks(user.id));
  } catch (err) {
    return errorResponse(err);
  }
}
