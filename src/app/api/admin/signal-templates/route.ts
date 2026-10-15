import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";
import { logTerminal } from "@/lib/logs";

export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATES = [
  "动量结构延续，绿电交易与虚拟电厂调度共振，短周期偏多。",
  "波动率抬升，储能充放对冲负荷调节，建议观望偏空。",
  "资金流因子占优，多能联供与区域供热形成支撑。",
  "情绪因子修复，碳资产流动性增强，生态综合指数上行概率略高。",
  "宏观因子中性，能效管理平稳，演算倾向窄幅震荡。",
];

const globalTpl = globalThis as typeof globalThis & { __cnxTemplates?: string[] };

export async function GET() {
  try {
    await requireScope("content");
    return ok({ templates: globalTpl.__cnxTemplates ?? DEFAULT_TEMPLATES });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireScope("content");
    const body = (await req.json().catch(() => ({}))) as { templates?: string[] };
    const templates = (Array.isArray(body.templates) ? body.templates : [])
      .map((t) => String(t).slice(0, 120))
      .filter(Boolean)
      .slice(0, 20);
    globalTpl.__cnxTemplates = templates.length ? templates : DEFAULT_TEMPLATES;
    await writeAdminLog(admin, "signal-templates", "content", "templates", { count: templates.length });
    await logTerminal("warn", "控制台", `能源指数研判文案模板库已更新 | ${templates.length} 条`);
    return ok({ templates: globalTpl.__cnxTemplates });
  } catch (err) {
    return errorResponse(err);
  }
}
