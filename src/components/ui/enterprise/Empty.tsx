"use client";

import type { ReactNode } from "react";

/**
 * Empty — 空状态
 */
export function Empty({
  text = "暂无数据",
  icon,
  action,
}: {
  text?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-3 text-4xl opacity-30">{icon || "📭"}</div>
      <p className="text-sm text-gray-400">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
