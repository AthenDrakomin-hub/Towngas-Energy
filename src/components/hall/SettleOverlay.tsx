"use client";

import clsx from "clsx";
import { fmtInt, RESULT_LABEL } from "@/lib/format";
import type { Settled } from "./types";

/**
 * SettleOverlay — 周期结算揭晓浮层
 */
export function SettleOverlay({ data }: { data: Settled }) {
  const tone = data.result === "up" ? "text-[#00a650]" : data.result === "down" ? "text-[#ff4d4f]" : "text-[#f5a623]";
  const barColor = data.result === "up" ? "#00a650" : data.result === "down" ? "#ff4d4f" : "#f5a623";
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[90] animate-slide-in-right">
      <div className="w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="h-1 w-full" style={{ background: barColor }} />
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-wider text-gray-400">周期结算揭晓</span>
            <span className="num text-[10px] text-gray-400">{data.code}</span>
          </div>
          <div className={clsx("num mt-2 text-2xl font-bold", tone)}>
            {RESULT_LABEL[data.result] ?? data.result}
          </div>
          <div className="num mt-2 text-[10px] text-gray-500">
            开奖号码 [{(data.settleCar ?? []).join(",")}] · 服务费回收 {fmtInt(data.rakeAmount)}
          </div>
        </div>
      </div>
    </div>
  );
}
