"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Table — 基础表格
 */
export function Table<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  emptyText = "暂无数据",
  onRowClick,
}: {
  columns: { key: string; title: string; width?: string; align?: "left" | "center" | "right"; render?: (row: T) => ReactNode }[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={clsx("px-3 py-2.5 text-xs font-semibold text-gray-500", col.align === "center" && "text-center", col.align === "right" && "text-right")}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-12 text-center text-sm text-gray-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={clsx("border-b border-gray-100 transition-colors hover:bg-gray-50", onRowClick && "cursor-pointer")}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx("px-3 py-2.5 text-gray-700", col.align === "center" && "text-center", col.align === "right" && "text-right")}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
