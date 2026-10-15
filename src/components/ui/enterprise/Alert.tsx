"use client";

import { useState } from "react";
import clsx from "clsx";

/**
 * Alert — 警告提示
 */
export function Alert({
  type = "info",
  title,
  message,
  closable = false,
}: {
  type?: "success" | "warning" | "error" | "info";
  title?: string;
  message: string;
  closable?: boolean;
}) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  const typeMap = {
    success: "border-[#00a650]/30 bg-[#00a650]/5 text-[#008153]",
    warning: "border-[#f5a623]/30 bg-[#f5a623]/5 text-[#b45309]",
    error: "border-[#ff4d4f]/30 bg-[#ff4d4f]/5 text-[#dc2626]",
    info: "border-[#1890ff]/30 bg-[#1890ff]/5 text-[#1d4ed8]",
  };
  const iconMap = { success: "✓", warning: "⚠", error: "✕", info: "ℹ" };
  return (
    <div className={clsx("flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5", typeMap[type])}>
      <span className="text-sm font-bold">{iconMap[type]}</span>
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        <div className="text-xs leading-relaxed opacity-90">{message}</div>
      </div>
      {closable && (
        <button onClick={() => setClosed(true)} className="text-xs opacity-60 hover:opacity-100">✕</button>
      )}
    </div>
  );
}
