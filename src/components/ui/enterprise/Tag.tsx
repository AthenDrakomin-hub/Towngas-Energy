"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Tag — 标签
 */
export function Tag({
  children,
  color = "gray",
  size = "sm",
}: {
  children: ReactNode;
  color?: "green" | "red" | "orange" | "blue" | "gray" | "pink";
  size?: "xs" | "sm";
}) {
  const colorMap = {
    green: "bg-[#00a650]/10 text-[#00a650] border-[#00a650]/20",
    red: "bg-[#ff4d4f]/10 text-[#ff4d4f] border-[#ff4d4f]/20",
    orange: "bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/20",
    blue: "bg-[#1890ff]/10 text-[#1890ff] border-[#1890ff]/20",
    gray: "bg-gray-100 text-gray-500 border-gray-200",
    pink: "bg-[#f06eb3]/10 text-[#f06eb3] border-[#f06eb3]/20",
  };
  const sizeMap = { xs: "px-1.5 py-0.5 text-[10px]", sm: "px-2 py-0.5 text-[11px]" };
  return (
    <span className={clsx("inline-flex items-center rounded border font-medium", colorMap[color], sizeMap[size])}>
      {children}
    </span>
  );
}
