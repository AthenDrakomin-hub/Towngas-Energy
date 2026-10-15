"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Empty } from "../enterprise/Empty";
import { Pagination } from "../enterprise/Pagination";

export type DataTableColumn<T> = {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
};

/**
 * DataTable — 企业级数据表格
 * 支持排序、分页、空状态、行点击
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  emptyText = "暂无数据",
  onRowClick,
  pageSize = 10,
  currentPage,
  onPageChange,
  total,
  sortKey,
  onSort,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  total?: number;
  sortKey?: string;
  onSort?: (key: string) => void;
}) {
  const [internalPage, setInternalPage] = useState(1);
  const page = currentPage ?? internalPage;
  const handlePageChange = (p: number) => {
    if (!onPageChange) setInternalPage(p);
    onPageChange?.(p);
  };

  const totalCount = total ?? data.length;
  const showPagination = totalCount > pageSize;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={clsx(
                    "px-3 py-2.5 text-xs font-semibold text-gray-500",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.sortable && "cursor-pointer select-none hover:text-gray-700",
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.title}
                    {col.sortable && (
                      <span className="text-[10px] opacity-60">
                        {sortKey === col.key ? "↓" : "↕"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <Empty text={emptyText} />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    "border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        "px-3 py-2.5 text-gray-700",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right",
                      )}
                    >
                      {col.render ? col.render(row, idx) : String(row[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <Pagination
          current={page}
          total={totalCount}
          pageSize={pageSize}
          onChange={handlePageChange}
        />
      )}
    </div>
  );
}
