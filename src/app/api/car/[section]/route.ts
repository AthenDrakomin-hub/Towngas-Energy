import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { carResults } from "@/db/schema";
import { errorResponse, ok } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { tickEngine } from "@/lib/engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ section: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { section } = await ctx.params;
  try {
    await ensureBootstrap();
    if (section === "latest") {
      await tickEngine();
      const rows = await db.select().from(carResults).orderBy(desc(carResults.onlinetime)).limit(1);
      return ok(rows[0] ?? null);
    }
    if (section === "history") {
      const url = new URL(req.url);
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 180), 1440);
      const rows = await db.select().from(carResults).orderBy(desc(carResults.onlinetime)).limit(limit);
      const stats = await db
        .select({
          total: sql<number>`count(*)::int`,
          live: sql<number>`count(*) filter (where source = 'es77')::int`,
          replay: sql<number>`count(*) filter (where source = 'replay')::int`,
        })
        .from(carResults);
      return ok({ rows: rows.reverse(), stats: stats[0] });
    }
    return Response.json({ ok: false, message: "未知分区" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
