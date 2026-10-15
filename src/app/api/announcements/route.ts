import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { errorResponse, ok } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureBootstrap();
    const url = new URL(req.url);
    const all = url.searchParams.get("all") === "1";
    const rows = all
      ? await db.select().from(announcements).orderBy(desc(announcements.id))
      : await db
          .select()
          .from(announcements)
          .where(and(eq(announcements.status, "published")))
          .orderBy(desc(announcements.publishedAt))
          .limit(20);
    return ok(rows);
  } catch (err) {
    return errorResponse(err);
  }
}
