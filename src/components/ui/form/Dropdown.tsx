"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

export type DropdownItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
};

/**
 * Dropdown — 下拉菜单
 */
export function Dropdown({
  trigger,
  items,
  onSelect,
  align = "left",
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (key: string) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={clsx(
            "absolute z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-toast-in",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) =>
            item.divider ? (
              <div key={item.key} className="my-1 border-t border-gray-100" />
            ) : (
              <button
                key={item.key}
                disabled={item.disabled}
                onClick={() => {
                  onSelect(item.key);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  item.danger
                    ? "text-danger hover:bg-danger/5"
                    : "text-gray-700 hover:bg-gray-50",
                  item.disabled && "cursor-not-allowed opacity-40",
                )}
              >
                {item.icon && <span className="text-gray-400">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
