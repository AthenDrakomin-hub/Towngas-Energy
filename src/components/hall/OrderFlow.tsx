"use client";

import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Metric } from "@/components/ui/Panel";
import { fmtInt, fmtPct } from "@/lib/format";
import type { Round } from "./types";

/**
 * OrderFlow — 订单流面板
 */
export function OrderFlow({ round }: { round: Round | null }) {
  return (
    <Card title="订单流" status="live" right={<Badge tone="success">实时</Badge>}>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="买盘占比" value={fmtPct(round?.upShare ?? 0)} tone="up" />
        <Metric label="卖盘占比" value={fmtPct(round?.downShare ?? 0)} tone="down" />
        <Metric
          label="大单净流入"
          value={`${(round?.upShare ?? 0) - (round?.downShare ?? 0) >= 0 ? "+" : ""}${fmtInt(
            ((round?.upShare ?? 0) - (round?.downShare ?? 0)) * (round?.totalPool ?? 0) * 0.18,
          )}`}
          tone={(round?.upShare ?? 0) >= 0.5 ? "up" : "down"}
        />
      </div>
      <div className="mt-3 flex h-6 items-stretch overflow-hidden rounded-lg">
        <div className="bar-fill bg-success/70" style={{ width: `${(round?.upShare ?? 0.5) * 100}%` }} />
        <div className="bar-fill bg-danger/70" style={{ width: `${(round?.downShare ?? 0.5) * 100}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-text-3">
        <span>盘口深度: <span className="num text-text-2">{fmtInt((round?.totalPool ?? 0) / 8)}</span></span>
        <span>聚合延迟: <span className="num text-text-2">0.8s</span></span>
      </div>
    </Card>
  );
}
