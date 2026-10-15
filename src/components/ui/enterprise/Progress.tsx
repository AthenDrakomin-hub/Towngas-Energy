"use client";

import clsx from "clsx";
import { fmtPct } from "@/lib/format";

/**
 * Progress — 进度条
 */
export function Progress({
  percent,
  color = "#00a650",
  size = "md",
  showText = true,
}: {
  percent: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const heightMap = { sm: "h-1.5", md: "h-2", lg: "h-3" };
  return (
    <div className="flex items-center gap-2">
      <div className={clsx("flex-1 overflow-hidden rounded-full bg-gray-100", heightMap[size])}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }}
        />
      </div>
      {showText && <span className="text-xs font-medium text-gray-600 num">{fmtPct(percent)}</span>}
    </div>
  );
}
