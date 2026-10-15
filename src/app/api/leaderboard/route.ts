import { errorResponse, ok } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { leaderboard } from "@/lib/gamification";

export const dynamic = "force-dynamic";

const KINDS = ["day", "week", "all", "winrate", "active"] as const;

export async function GET(req: Request) {
  try {
    await ensureBootstrap();
    const url = new URL(req.url);
    const raw = url.searchParams.get("kind") ?? "day";
    const kind = (KINDS as readonly string[]).includes(raw) ? (raw as "day" | "week" | "all" | "winrate" | "active") : "day";
    return ok(await leaderboard(kind));
  } catch (err) {
    return errorResponse(err);
  }
}
