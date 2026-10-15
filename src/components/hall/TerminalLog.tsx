"use client";

import clsx from "clsx";
import { Card } from "@/components/ui/display/Card";
import { Empty } from "@/components/ui/enterprise/Empty";
import type { LogRow } from "./types";

/**
 * TerminalLog — 运行日志面板
 */
export function TerminalLog({ logs }: { logs: LogRow[] }) {
  return (
    <Card title="运行日志" status="live" stamp="LIVE">
      <div className="h-[130px] overflow-y-auto pr-1 font-mono text-[10.5px] leading-[1.6]">
        {logs.length === 0 && <Empty text="日志通道建立中..." />}
        {logs.map((l) => (
          <div key={l.id} className="animate-tick-in flex gap-1.5 whitespace-nowrap">
            <span className="text-text-4">[{new Date(l.ts).toISOString().slice(11, 22)}]</span>
            <span
              className={clsx(
                "shrink-0",
                l.level === "warn" ? "text-warning" : l.level === "error" ? "text-danger" : "text-primary",
              )}
            >
              {l.module}
            </span>
            <span className="truncate text-text-2/80">{l.message}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
