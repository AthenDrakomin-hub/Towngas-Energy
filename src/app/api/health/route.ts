import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/** 健康检查端点 — 供 monitor.sh 和负载均衡使用 */
export async function GET() {
  try {
    // 探测数据库连通性
    await db.execute(sql`SELECT 1`);
    return Response.json(
      { status: "ok", timestamp: new Date().toISOString(), db: "connected" },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        db: "disconnected",
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 503 }
    );
  }
}
