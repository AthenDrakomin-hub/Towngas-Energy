"use client";

import { useState } from "react";
import clsx from "clsx";

/**
 * Tabs — 标签页
 */
export function Tabs({
  items,
  defaultKey,
  onChange,
}: {
  items: { key: string; label: string; count?: number }[];
  defaultKey?: string;
  onChange?: (key: string) => void;
}) {
  const [active, setActive] = useState(defaultKey || items[0]?.key);
  const handleClick = (key: string) => {
    setActive(key);
    onChange?.(key);
  };
  return (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => handleClick(item.key)}
          className={clsx(
            "relative px-4 py-2.5 text-sm font-medium transition-colors",
            active === item.key ? "text-[#00a650]" : "text-gray-500 hover:text-gray-800",
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={clsx("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]", active === item.key ? "bg-[#00a650]/10 text-[#00a650]" : "bg-gray-100 text-gray-400")}>
              {item.count}
            </span>
          )}
          {active === item.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00a650]" />}
        </button>
      ))}
    </div>
  );
}
