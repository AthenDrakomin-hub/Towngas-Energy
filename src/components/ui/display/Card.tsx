"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  title?: ReactNode;
  status?: "live" | "warn" | "off" | "idle";
  stamp?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
  hover?: boolean;
}

const statusColor = {
  live: "bg-success",
  warn: "bg-danger",
  idle: "bg-primary",
  off: "bg-text-4",
};

export function Card({ title, status = "live", stamp, right, children, className, bodyClass, hover }: CardProps) {
  return (
    <section
      className={clsx(
        "glass rounded-xl flex flex-col overflow-hidden",
        hover && "transition-all duration-200 hover:border-line-light hover:-translate-y-0.5",
        className,
      )}
    >
      {title && (
        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-4">
          {status && (
            <span
              className={clsx(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                statusColor[status],
                status === "live" && "animate-pulse-dot",
              )}
            />
          )}
          <h2 className="truncate text-xs font-semibold tracking-wider text-text-1/90 uppercase">{title}</h2>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-text-3">
            {right}
            {stamp && <span className="num">{stamp}</span>}
          </div>
        </header>
      )}
      <div className={clsx("min-w-0 flex-1 p-4", bodyClass)}>{children}</div>
    </section>
  );
}
