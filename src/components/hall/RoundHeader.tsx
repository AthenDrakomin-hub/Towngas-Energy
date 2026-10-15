"use client";

import clsx from "clsx";
import { Badge } from "@/components/ui/display/Badge";
import { fmtX } from "@/lib/format";
import type { Round } from "./types";

/**
 * RoundHeader — 顶部绿色头部栏（倒计时 + 周期信息 + 赔率）
 */
export function RoundHeader({
  round,
  seconds,
  t,
}: {
  round: Round | null;
  seconds: number;
  t: (key: string, fallback: string) => string;
}) {
  const isDanger = seconds <= 30 && seconds > 0;
  const phaseLabel =
    round?.phase === "betting"
      ? t("trading.phaseBetting", "投资窗口开放")
      : round?.phase === "settling"
        ? t("trading.phaseLocked", "已锁定 · 等待结算")
        : t("trading.phaseSettled", "已结算");

  return (
    <div className="rounded-lg bg-[#00a650] p-4 text-white shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 左侧：标题 + 周期编号 */}
        <div className="flex items-center gap-4">
          <div>
            <div className="text-lg font-bold">{t("trading.title", "竞标结果")}</div>
            <div className="text-[11px] text-white/70">
              本轮交易:{round?.code ?? "----------"} | {t("trading.countdownLabel", "竞标截止倒计时")}
            </div>
          </div>
        </div>

        {/* 中间：黑色方块倒计时 */}
        <div className="flex items-center gap-1.5">
          {String(Math.floor(seconds / 3600)).padStart(2, "0").split("").map((d, i) => (
            <div key={`h${i}`} className="flex h-10 w-8 items-center justify-center rounded bg-gray-900 text-lg font-bold num">{d}</div>
          ))}
          <span className="text-lg font-bold text-white/60">:</span>
          {String(Math.floor((seconds % 3600) / 60)).padStart(2, "0").split("").map((d, i) => (
            <div key={`m${i}`} className="flex h-10 w-8 items-center justify-center rounded bg-gray-900 text-lg font-bold num">{d}</div>
          ))}
          <span className="text-lg font-bold text-white/60">:</span>
          {String(seconds % 60).padStart(2, "0").split("").map((d, i) => (
            <div key={`s${i}`} className={clsx("flex h-10 w-8 items-center justify-center rounded text-lg font-bold num", isDanger ? "bg-red-600 animate-pulse" : "bg-gray-900")}>{d}</div>
          ))}
        </div>

        {/* 右侧：状态 + 赔率 */}
        <div className="flex items-center gap-4">
          <Badge tone={round?.phase === "betting" ? "success" : "warning"} className="bg-white/20 text-white border-white/30">
            {phaseLabel}
          </Badge>
          <div className="hidden items-center gap-4 md:flex">
            <div className="text-center">
              <div className="text-[10px] text-white/70">{t("trading.betUp", "看多")}</div>
              <div className="num text-xl font-bold">{fmtX(round?.payoutUp)}x</div>
            </div>
            <div className="h-8 w-px bg-white/30" />
            <div className="text-center">
              <div className="text-[10px] text-white/70">{t("trading.betDown", "看空")}</div>
              <div className="num text-xl font-bold">{fmtX(round?.payoutDown)}x</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
