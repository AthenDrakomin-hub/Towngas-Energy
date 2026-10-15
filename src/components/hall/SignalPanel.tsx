"use client";

import clsx from "clsx";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Empty } from "@/components/ui/enterprise/Empty";

type SignalData = {
  direction: string;
  confidence: number;
  latencyMs: number;
  factors: { label: string; value: number }[];
  template: string;
};

/**
 * SignalPanel — 能源指数研判（五因子评分）
 */
export function SignalPanel({ signalData }: { signalData: SignalData | undefined }) {
  return (
    <Card title="能源指数研判 · 五因子评分" status="idle" right={<Badge tone="primary">五因子</Badge>} stamp={signalData ? `${signalData.latencyMs ?? 0}ms` : undefined}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-3">模型: 五因子综合评分</div>
        <div className="text-xs text-text-3">
          置信度: <span className="num text-primary">{(signalData?.confidence ?? 0).toFixed(1)}%</span>
        </div>
      </div>
      <div
        className={clsx(
          "num mt-2 text-4xl leading-none font-bold",
          signalData?.direction === "up" ? "text-success" : signalData?.direction === "down" ? "text-danger" : "text-text-4",
        )}
      >
        {signalData?.direction === "up" ? "▲ 看多" : signalData?.direction === "down" ? "▼ 看空" : "— 观望"}
      </div>
      <div className="mt-3 space-y-2">
        {(signalData?.factors ?? []).map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] text-text-3">├─ {f.label}</span>
            <span className={clsx("num w-12 text-right text-[11px]", f.value >= 0 ? "text-success" : "text-danger")}>
              {f.value >= 0 ? "+" : ""}{f.value.toFixed(2)}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-3">
              <div
                className={clsx("h-full rounded-full", f.value >= 0 ? "bg-success" : "bg-danger")}
                style={{ width: `${Math.min(100, Math.abs(f.value) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {!signalData && <Empty text="推理链路初始化中..." />}
      </div>
      <div className="mt-3 border-t border-line pt-2 text-[10px] leading-relaxed text-text-3">
        推理耗时: <span className="num">{(signalData?.latencyMs ?? 0).toFixed(1)}ms</span> │ 历史准确率: <span className="num text-primary">51.3%</span>
        <div className="mt-1">{signalData?.template ?? ""}</div>
      </div>
    </Card>
  );
}
