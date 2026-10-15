"use client";

import clsx from "clsx";

/**
 * Steps — 步骤条
 */
export function Steps({
  items,
  current,
}: {
  items: string[];
  current: number;
}) {
  return (
    <div className="flex items-center">
      {items.map((item, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i < current ? "bg-[#00a650] text-white" : i === current ? "bg-[#00a650] text-white ring-4 ring-[#00a650]/20" : "bg-gray-100 text-gray-400",
              )}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span className={clsx("mt-1.5 text-[11px] whitespace-nowrap", i <= current ? "text-gray-800 font-medium" : "text-gray-400")}>
              {item}
            </span>
          </div>
          {i < items.length - 1 && (
            <div className={clsx("mx-2 h-0.5 flex-1 -mt-5", i < current ? "bg-[#00a650]" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  );
}
