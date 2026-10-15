import { sql } from "drizzle-orm";
import { db } from "@/db";
import { PLATFORM } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, platform: PLATFORM.fullName, node: PLATFORM.node });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
