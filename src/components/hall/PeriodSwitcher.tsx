"use client";

import clsx from "clsx";
import { PERIODS, PERIOD_KEYS, type PeriodKey } from "@/lib/constants";

/**
 * PeriodSwitcher — 周期切换器（1m/5m/10m/15m/30m）
 */
export function PeriodSwitcher({
  period,
  onChange,
}: {
  period: PeriodKey;
  onChange: (p: PeriodKey) => void;
}) {
  const periodCfg = PERIODS[period];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_KEYS.map((key) => {
        const p = PERIODS[key];
        const active = period === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              active
                ? "text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200",
            )}
            style={active ? { backgroundColor: p.color } : undefined}
          >
            {p.label}
          </button>
        );
      })}
      <div className="ml-auto text-xs text-gray-400">
        最低投资 {periodCfg.minBet.toLocaleString()} 积分 | 单期上限 {periodCfg.maxBetPerRound.toLocaleString()} 积分
      </div>
    </div>
  );
}
