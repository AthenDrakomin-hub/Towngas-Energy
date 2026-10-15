"use client";

import clsx from "clsx";
import { Card } from "@/components/ui/display/Card";
import { EEI_DIMS } from "@/lib/constants";
import { fmtInt } from "@/lib/format";
import type { Car } from "./types";

/**
 * EeiDisplay — 实时能源指数（EEI 十维展示）
 */
export function EeiDisplay({ car }: { car: Car | null }) {
  return (
    <Card title="实时能源指数" status="live" stamp={car ? car.onlinetime.slice(11, 19) : undefined}>
      <div className="grid grid-cols-2 gap-1.5">
        {EEI_DIMS.map((dim) => {
          const v = car?.car?.[dim.index];
          return (
            <div key={dim.key} className="rounded-lg bg-bg-1 px-2 py-1.5">
              <div className="truncate text-[9px] text-text-3">{dim.label}</div>
              <div
                className={clsx(
                  "num text-base font-bold",
                  dim.index === 9 ? "text-warning" : (v ?? 0) >= 6 ? "text-success" : "text-text-3",
                )}
              >
                {v ?? "-"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 space-y-1 border-t border-line pt-2 text-[10px] text-text-3">
        <div className="flex justify-between"><span>生态活跃度</span><span className="num text-text-2">{fmtInt(car?.onlineCount ?? 0)}</span></div>
        <div className="flex justify-between gap-2"><span>链上凭证</span><span className="num truncate text-primary">{(car?.hashValue ?? "").slice(0, 14) || "--"}</span></div>
        <div className="flex justify-between"><span>数据源</span><span className="text-success">ES-77 · 已同步</span></div>
      </div>
    </Card>
  );
}
