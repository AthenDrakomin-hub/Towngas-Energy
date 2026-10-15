"use client";

import clsx from "clsx";

/**
 * Pagination — 分页
 */
export function Pagination({
  current,
  total,
  pageSize = 10,
  onChange,
}: {
  current: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return (
    <div className="flex items-center justify-between px-3 py-3">
      <span className="text-xs text-gray-400">共 {total} 条</span>
      <div className="flex items-center gap-1">
        <button
          disabled={current === 1}
          onClick={() => onChange(current - 1)}
          className="rounded px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={i} className="px-1 text-gray-400">...</span>
          ) : (
            <button
              key={i}
              onClick={() => onChange(p as number)}
              className={clsx(
                "min-w-[28px] rounded px-2 py-1 text-xs transition-colors",
                p === current ? "bg-[#00a650] text-white" : "text-gray-600 hover:bg-gray-100",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          disabled={current === totalPages}
          onClick={() => onChange(current + 1)}
          className="rounded px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
