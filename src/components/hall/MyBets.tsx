"use client";

import clsx from "clsx";
import { Card } from "@/components/ui/display/Card";
import { Empty } from "@/components/ui/enterprise/Empty";
import { fmtInt, fmtPct } from "@/lib/format";
import type { Round } from "./types";

/**
 * MyBets — 我的投资份额
 */
export function MyBets({ round }: { round: Round | null }) {
  return (
    <Card title="我的投资份额" status={round?.myBets?.length ? "live" : "off"}>
      {round?.myBets?.length ? (
        <div className="space-y-1">
          {round.myBets.map((b) => (
            <div key={b.id} className="flex items-center gap-2 border-b border-line/50 py-1.5 text-xs last:border-0">
              <span className={b.side === "up" ? "text-success" : "text-danger"}>{b.side === "up" ? "▲ 看多" : "▼ 看空"}</span>
              <span className="num text-text-1">{fmtInt(b.amount)}</span>
              <span className={clsx("ml-auto text-text-4")}>{b.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="本周期暂无投资份额" />
      )}
      <div className="mt-2 border-t border-line pt-2 text-[10px] text-text-3">
        负期望提示：每期服务费 {fmtPct(round?.rakeRate ?? 0.05)}，参与越多积分回收越快。
      </div>
    </Card>
  );
}
