import { errorResponse, ok, requireScope } from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import {
  getAllContentConfigs,
  getAllContentConfigsWithMeta,
  updateContentConfigs,
} from "@/lib/content-config";

export const dynamic = "force-dynamic";

/** GET /api/content-config — 获取全部文案配置 */
export async function GET(req: Request) {
  try {
    await ensureBootstrap();
    const url = new URL(req.url);
    const withMeta = url.searchParams.get("meta") === "1";
    if (withMeta) {
      // 管理端编辑用：含分类、描述、更新时间
      await requireScope("content");
      const rows = await getAllContentConfigsWithMeta();
      return ok(rows);
    }
    // 前端用：key->value映射
    const map = await getAllContentConfigs();
    return ok(map);
  } catch (err) {
    return errorResponse(err);
  }
}

/** PUT /api/content-config — 批量更新文案配置 */
export async function PUT(req: Request) {
  try {
    await ensureBootstrap();
    await requireScope("content");
    const body = await req.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    if (!updates.length) {
      return Response.json({ ok: false, message: "没有需要更新的配置" }, { status: 400 });
    }
    const count = await updateContentConfigs(updates);
    return ok({ updated: count });
  } catch (err) {
    return errorResponse(err);
  }
}
