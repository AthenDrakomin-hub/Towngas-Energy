"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * ColorCard — 彩色功能卡片（参考官网服务管理页）
 */
export function ColorCard({
  title,
  subtitle,
  action,
  color,
  icon,
  onClick,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  color: "pink" | "orange" | "blue" | "green";
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const colorMap = {
    pink: "bg-[#f06eb3]",
    orange: "bg-[#f5a623]",
    blue: "bg-[#1890ff]",
    green: "bg-[#00a650]",
  };
  return (
    <div
      onClick={onClick}
      className={clsx("rounded-lg p-4 text-white shadow-sm hover:shadow-md transition-all cursor-pointer", colorMap[color])}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {subtitle && <div className="mt-0.5 text-[11px] text-white/70">{subtitle}</div>}
        </div>
        {icon && <div className="text-xl opacity-80">{icon}</div>}
      </div>
      {action && (
        <div className="mt-3 inline-block rounded bg-white/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
          {action}
        </div>
      )}
    </div>
  );
}
