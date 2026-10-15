import { errorResponse, ok, getSessionUser } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { currentRoundSnapshot, tickEngine } from "@/lib/engine";
import { latestCar } from "@/lib/collector";
import { PERIOD_KEYS, type PeriodKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureBootstrap();
    await tickEngine();
    const user = await getSessionUser();
    const url = new URL(req.url);
    const period = (PERIOD_KEYS.includes(url.searchParams.get("period") as PeriodKey)
      ? url.searchParams.get("period")
      : "5m") as PeriodKey;
    const snapshot = await currentRoundSnapshot(user?.id, period);
    const car = (await latestCar(1))[0] ?? null;
    return ok({ round: snapshot, car, period });
  } catch (err) {
    return errorResponse(err);
  }
}
