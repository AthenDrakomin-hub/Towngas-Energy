import { desc } from "drizzle-orm";
import { db } from "@/db";
import { carResults } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";
import { bootstrapStatus } from "@/lib/bootstrap";
import { collectorHealth, missingWindows, runCollector } from "@/lib/collector";
import { logTerminal } from "@/lib/logs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ action: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    await requireScope("dashboard");
    if (action === "status") {
      const health = await collectorHealth();
      const status = await bootstrapStatus();
      const latest = await db.select().from(carResults).orderBy(desc(carResults.onlinetime)).limit(12);
      return ok({ health, status, latest });
    }
    if (action === "missing") {
      return ok(await missingWindows(6));
    }
    if (action === "export") {
      const rows = await db.select().from(carResults).orderBy(desc(carResults.onlinetime)).limit(2000);
      const header = "onlinetime,car,online_count,hash_value,source";
      const csv = [
        header,
        ...rows.map((r) =>
          [
            r.onlinetime.toISOString().replace("T", " ").slice(0, 19),
            `"${r.car.join("|")}"`,
            r.onlineCount ?? "",
            r.hashValue ?? "",
            r.source,
          ].join(","),
        ),
      ].join("\n");
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="aiot-cold-archive-${Date.now()}.csv"`,
        },
      });
    }
    return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(_req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    const admin = await requireScope("dashboard");
    if (action !== "trigger") return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
    const result = await runCollector(true);
    await writeAdminLog(admin, "collector-trigger", "collector", "es77", { ...result });
    await logTerminal("warn", "控制台", `管理端手动触发采集 | 新增=${result.inserted} 条`);
    return ok(result);
  } catch (err) {
    return errorResponse(err);
  }
}
