"use client";

import Link from "next/link";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { fmtInt, fmtPct, fmtX } from "@/lib/format";
import type { Round } from "./types";
import type { Me } from "@/components/Shell";

/**
 * BetPanel — 投资面板
 */
export function BetPanel({
  round,
  me,
  t,
  onOpenBet,
}: {
  round: Round | null;
  me: Me | null;
  t: (key: string, fallback: string) => string;
  onOpenBet: (side: "up" | "down") => void;
}) {
  return (
    <Card title="建立投资份额" status={round?.phase === "betting" ? "live" : "warn"}>
      {/* 池子分布 */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-success font-medium">{t("trading.upPool", "看多池")}</span>
            <span className="num text-success">{fmtInt(round?.upPool)} ({fmtPct(round?.upShare)})</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-bg-3 overflow-hidden">
            <div className="bar-fill h-full bg-success rounded-full" style={{ width: `${(round?.upShare ?? 0) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-danger font-medium">{t("trading.downPool", "看空池")}</span>
            <span className="num text-danger">{fmtInt(round?.downPool)} ({fmtPct(round?.downShare)})</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-bg-3 overflow-hidden">
            <div className="bar-fill h-full bg-danger rounded-full" style={{ width: `${(round?.downShare ?? 0) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* 服务费 */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
        <div>
          <div className="label">服务费</div>
          <div className="num mt-0.5 text-sm text-text-2">{fmtInt(round?.rakeAmount)} <span className="text-text-4">({fmtPct(round?.rakeRate ?? 0)})</span></div>
        </div>
        <div>
          <div className="label">最小/最大</div>
          <div className="num mt-0.5 text-sm text-text-2">{fmtInt(round?.minBet)} / {fmtInt(round?.maxBetPerRound)}</div>
        </div>
      </div>

      {/* 投资按钮 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          variant="success"
          size="lg"
          disabled={round?.phase !== "betting" || !me}
          onClick={() => onOpenBet("up")}
        >
          {t("trading.betUp", "看多")} {fmtX(round?.payoutUp)}x
        </Button>
        <Button
          variant="danger"
          size="lg"
          disabled={round?.phase !== "betting" || !me}
          onClick={() => onOpenBet("down")}
        >
          {t("trading.betDown", "看空")} {fmtX(round?.payoutDown)}x
        </Button>
      </div>
      {!me && (
        <p className="mt-2 text-xs text-text-3 text-center">
          未接入平台 · <Link href="/login" className="text-primary hover:underline">立即接入</Link>
        </p>
      )}
    </Card>
  );
}
