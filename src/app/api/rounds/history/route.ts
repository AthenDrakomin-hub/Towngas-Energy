import { errorResponse, ok } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { roundsHistory } from "@/lib/engine";
import { PERIOD_KEYS, type PeriodKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureBootstrap();
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 60), 300);
    const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));
    const periodParam = url.searchParams.get("period");
    const period = PERIOD_KEYS.includes(periodParam as PeriodKey) ? (periodParam as PeriodKey) : undefined;
    const rows = await roundsHistory(limit, page * limit, period);
    return ok(rows);
  } catch (err) {
    return errorResponse(err);
  }
}
