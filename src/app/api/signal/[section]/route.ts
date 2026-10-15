import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { rounds, signals } from "@/db/schema";
import { errorResponse, ok } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { PERIOD_KEYS, SIGNAL_MODEL, type PeriodKey } from "@/lib/constants";
import { currentRoundSnapshot, tickEngine } from "@/lib/engine";
import { signalAccuracy } from "@/lib/signal";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ section: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { section } = await ctx.params;
  try {
    await ensureBootstrap();
    await tickEngine();
    if (section === "current") {
      const url = new URL(req.url);
      const period = (PERIOD_KEYS.includes(url.searchParams.get("period") as PeriodKey)
        ? url.searchParams.get("period")
        : "5m") as PeriodKey;
      const snapshot = await currentRoundSnapshot(undefined, period);
      if (!snapshot) return ok(null);
      const rows = await db.select().from(signals).where(eq(signals.roundId, snapshot.id)).limit(1);
      return ok(rows[0] ?? null);
    }
    if (section === "history") {
      const rows = await db
        .select({
          roundCode: signals.roundCode,
          direction: signals.direction,
          confidence: signals.confidence,
          result: rounds.result,
          createdAt: signals.createdAt,
        })
        .from(signals)
        .innerJoin(rounds, eq(rounds.id, signals.roundId))
        .orderBy(desc(signals.id))
        .limit(60);
      return ok(rows);
    }
    if (section === "model") {
      const acc = await signalAccuracy();
      return ok({ ...SIGNAL_MODEL, ...acc });
    }
    return Response.json({ ok: false, message: "未知分区" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
