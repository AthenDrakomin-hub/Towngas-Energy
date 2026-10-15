"use client";

import { ReactNode } from "react";

interface CardProps {
  title?: string;
  status?: "live" | "warning" | "error" | "info";
  children: ReactNode;
  className?: string;
}

const statusStyles: Record<string, string> = {
  live: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

const statusLabels: Record<string, string> = {
  live: "运行中",
  warning: "注意",
  error: "异常",
  info: "信息",
};

export function Card({ title, status, children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {(title || status) && (
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-gray-800">{title}</h3>}
          {status && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
              {statusLabels[status]}
            </span>
          )}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
