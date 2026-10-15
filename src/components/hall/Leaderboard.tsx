"use client";

import clsx from "clsx";
import { Card } from "@/components/ui/display/Card";
import { Tabs } from "@/components/ui/enterprise/Tabs";
import { Empty } from "@/components/ui/enterprise/Empty";
import { fmtInt } from "@/lib/format";
import type { LbRow } from "./types";

/**
 * Leaderboard — 生态节能减排榜
 */
export function Leaderboard({
  board,
  lbKind,
  onKindChange,
}: {
  board: LbRow[];
  lbKind: "day" | "week" | "all";
  onKindChange: (kind: "day" | "week" | "all") => void;
}) {
  return (
    <Card
      title="生态节能减排榜"
      status="live"
      right={
        <div className="w-32">
          <Tabs
            items={[{ key: "day", label: "日榜" }, { key: "week", label: "周榜" }, { key: "all", label: "总榜" }]}
            defaultKey={lbKind}
            onChange={(k) => onKindChange(k as "day" | "week" | "all")}
          />
        </div>
      }
    >
      <div className="space-y-1">
        {board.length === 0 && <Empty />}
        {board.map((row) => (
          <div key={row.rank} className="flex items-center gap-2 border-b border-line/50 py-1.5 last:border-0">
            <span className={clsx("num w-6 text-[11px]", row.rank <= 3 ? "text-warning" : "text-text-4")}>
              {String(row.rank).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-text-2">{row.nickname}</span>
            <span className="num text-[10px] text-text-4">{fmtInt(row.volume / 1000)}k</span>
            <span className={clsx("num w-16 text-right text-[11px]", row.profit >= 0 ? "text-success" : "text-danger")}>
              {row.profit >= 0 ? "+" : ""}{fmtInt(row.profit)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
