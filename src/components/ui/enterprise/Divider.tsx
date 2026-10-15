"use client";

import clsx from "clsx";

/**
 * Divider — 分割线
 */
export function Divider({ text, orientation = "center" }: { text?: string; orientation?: "left" | "center" | "right" }) {
  if (!text) return <div className="my-4 h-px bg-gray-200" />;
  return (
    <div className={clsx("my-4 flex items-center gap-3", orientation === "left" && "justify-start", orientation === "right" && "justify-end")}>
      {orientation !== "left" && <div className="h-px flex-1 bg-gray-200" />}
      <span className="text-xs text-gray-400">{text}</span>
      {orientation !== "right" && <div className="h-px flex-1 bg-gray-200" />}
    </div>
  );
}
