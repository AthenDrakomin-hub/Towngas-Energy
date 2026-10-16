import { errorResponse, ok, requireScope } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { currentRoundSnapshot, tickEngine } from "@/lib/engine";

export const dynamic = "force-dynamic";

/**
 * 手动触发引擎心跳（强制采集数据）
 * 仅管理员可调用，防止恶意频繁触发上游数据源
 * 普通用户访问 rounds/current、signal、stream 等接口时会自动触发限频心跳
 */
export async function GET() {
  try {
    await requireScope("admin");
    await ensureBootstrap();
    await tickEngine(true);
    const snapshot = await currentRoundSnapshot();
    return ok({ tickedAt: new Date().toISOString(), round: snapshot });
  } catch (err) {
    return errorResponse(err);
  }
}

export const POST = GET;
