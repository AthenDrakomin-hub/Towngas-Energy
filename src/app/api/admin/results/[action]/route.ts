import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { resultOverrides, roundSettlements, rounds } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";
import { getConfig, setConfig } from "@/lib/config";
import { logTerminal } from "@/lib/logs";
import { analyzeCar } from "@/lib/settlement";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ action: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    if (action === "rules") {
      await requireScope("results");
      return ok({ config: await getConfig(true) });
    }
    if (action === "history") {
      await requireScope("results");
      const rows = await db
        .select({
          code: rounds.code,
          startTime: rounds.startTime,
          result: rounds.result,
          resultSource: rounds.resultSource,
          settleCar: rounds.settleCar,
          totalPool: rounds.totalPool,
          rakeAmount: rounds.rakeAmount,
        })
        .from(rounds)
        .orderBy(desc(rounds.startTime))
        .limit(80);
      const anomalies = rows.filter((r) => r.resultSource === "collector_gap" || r.resultSource === "admin_override");
      return ok({ rows, anomalies });
    }
    return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    if (action === "preview") {
      await requireScope("results");
      const body = (await req.json().catch(() => ({}))) as { car?: number[] };
      const car = Array.isArray(body.car) ? body.car.map((n) => Number(n)).slice(0, 10) : [];
      if (car.length < 10) return Response.json({ ok: false, message: "需要 10 维 EEI 数组" }, { status: 400 });
      const analysis = analyzeCar(car);
      return ok({
        analysis,
        result: analysis.ruleA,
        note:
          analysis.ruleA === "draw"
            ? "双重奇偶判定平局 → 若启用 五因子仲裁，将有 55% 概率由 五因子综合评分 决定方向"
            : `规则A直接判定 → ${analysis.ruleA === "up" ? "看多" : "看空"}`,
      });
    }
    const admin = await requireScope("results");
    if (action === "override-next") {
      const body = (await req.json().catch(() => ({}))) as { direction?: string; note?: string };
      const direction = body.direction === "up" || body.direction === "down" || body.direction === "draw" ? body.direction : null;
      if (!direction) return Response.json({ ok: false, message: "无效结果" }, { status: 400 });
      await db.insert(resultOverrides).values({ direction, note: body.note ?? "" });
      await writeAdminLog(admin, "override-next", "results", "next", { direction, note: body.note ?? "" });
      await logTerminal("warn", "控制台", `已为下一周期指定结果 → ${direction}`);
      return ok({ direction });
    }
    if (action === "clear-overrides") {
      await db
        .update(resultOverrides)
        .set({ consumedAt: new Date() })
        .where(isNull(resultOverrides.consumedAt));
      await writeAdminLog(admin, "clear-overrides", "results", "all", {});
      return ok({ cleared: true });
    }
    return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const { action } = await ctx.params;
  try {
    const admin = await requireScope("results");
    if (action !== "rules") return Response.json({ ok: false, message: "未知操作" }, { status: 404 });
    const body = (await req.json().catch(() => ({}))) as { settlementRule?: string; aiArbitration?: boolean };
    const patch: { settlementRule?: "A" | "A+B"; aiArbitration?: boolean } = {};
    if (body.settlementRule === "A" || body.settlementRule === "A+B") patch.settlementRule = body.settlementRule;
    if (typeof body.aiArbitration === "boolean") patch.aiArbitration = body.aiArbitration;
    const next = await setConfig(patch);
    await writeAdminLog(admin, "rules-update", "config", "results", patch as Record<string, unknown>);
    await logTerminal("warn", "控制台", `清算规则已切换 | ${JSON.stringify(patch)}`);
    return ok(next);
  } catch (err) {
    return errorResponse(err);
  }
}
