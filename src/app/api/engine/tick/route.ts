import { errorResponse, ok } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { currentRoundSnapshot, tickEngine } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureBootstrap();
    await tickEngine(true);
    const snapshot = await currentRoundSnapshot();
    return ok({ tickedAt: new Date().toISOString(), round: snapshot });
  } catch (err) {
    return errorResponse(err);
  }
}

export const POST = GET;
