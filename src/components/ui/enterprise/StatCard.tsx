"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { fmtInt } from "@/lib/format";

/**
 * StatCard — 统计卡片
 */
export function StatCard({
  label,
  value,
  unit,
  trend,
  trendUp,
  icon,
  color = "green",
}: {
  label: string;
  value: number | string;
  unit?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: ReactNode;
  color?: "green" | "blue" | "orange" | "pink" | "red";
}) {
  const colorMap = {
    green: "bg-[#00a650]/10 text-[#00a650]",
    blue: "bg-[#1890ff]/10 text-[#1890ff]",
    orange: "bg-[#f5a623]/10 text-[#f5a623]",
    pink: "bg-[#f06eb3]/10 text-[#f06eb3]",
    red: "bg-[#ff4d4f]/10 text-[#ff4d4f]",
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-800 num">{typeof value === "number" ? fmtInt(value) : value}</span>
            {unit && <span className="text-xs text-gray-400">{unit}</span>}
          </div>
          {trend && (
            <div className={clsx("mt-1 text-[11px]", trendUp ? "text-[#00a650]" : "text-[#ff4d4f]")}>
              {trendUp ? "↑" : "↓"} {trend}
            </div>
          )}
        </div>
        {icon && <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", colorMap[color])}>{icon}</div>}
      </div>
    </div>
  );
}
