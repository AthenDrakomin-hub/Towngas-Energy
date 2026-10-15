"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Empty, Metric, Tabs } from "@/components/ui/Panel";
import { fmtInt, fmtPct } from "@/lib/format";

type Kind = "day" | "week" | "all" | "winrate" | "active";
type Row = {
  rank: number;
  nickname: string;
  volume: number;
  profit: number;
  rounds: number;
  winRate: number;
  isBot: boolean;
};

const MEDAL_COLORS = ["#f0b90b", "#c0c0c0", "#cd7f32"];

export default function LeaderboardPage() {
  const [kind, setKind] = useState<Kind>("day");
  const { data } = useQuery({
    queryKey: ["lb", kind],
    queryFn: async () => (await fetch(`/api/leaderboard?kind=${kind}`)).json(),
    refetchInterval: 10000,
  });
  const rows: Row[] = data?.data ?? [];
  const totalProfit = rows.reduce((a, b) => a + b.profit, 0);
  const totalVolume = rows.reduce((a, b) => a + b.volume, 0);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <Shell>
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">生态节能减排榜</h1>
          <Tabs
            items={[
              { key: "day", label: "日榜" },
              { key: "week", label: "周榜" },
              { key: "all", label: "总榜" },
              { key: "winrate", label: "胜率榜" },
              { key: "active", label: "活跃榜" },
            ]}
            value={kind}
            onChange={setKind}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4"><div className="label">上榜节点</div><div className="num mt-1 text-xl font-bold text-gray-800">{fmtInt(rows.length)}</div></div>
          <div className="glass rounded-xl p-4"><div className="label">累计投资份额规模</div><div className="num mt-1 text-xl font-bold text-gray-600">{fmtInt(totalVolume)}</div></div>
          <div className="glass rounded-xl p-4"><div className="label">累计净盈亏</div><div className={clsx("num mt-1 text-xl font-bold", totalProfit >= 0 ? "text-success" : "text-danger")}>{fmtInt(totalProfit)}</div></div>
        </div>

        {/* 前三名领奖台 */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-4 items-end">
            {[top3[1], top3[0], top3[2]].map((r, i) => {
              if (!r) return <div key={i} />;
              const realRank = r.rank;
              const height = realRank === 1 ? "h-28" : realRank === 2 ? "h-20" : "h-16";
              return (
                <div key={r.rank} className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: `${MEDAL_COLORS[realRank - 1]}20`, color: MEDAL_COLORS[realRank - 1] }}>
                    {r.nickname?.[0]?.toUpperCase()}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-800 truncate max-w-full">{r.nickname}</div>
                  <div className={clsx("num text-sm font-bold", r.profit >= 0 ? "text-success" : "text-danger")}>
                    {r.profit >= 0 ? "+" : ""}{fmtInt(r.profit)}
                  </div>
                  <div className={clsx("mt-2 w-full rounded-t-lg flex items-center justify-center", height)} style={{ backgroundColor: `${MEDAL_COLORS[realRank - 1]}15`, borderTop: `2px solid ${MEDAL_COLORS[realRank - 1]}` }}>
                    <span className="num text-2xl font-bold" style={{ color: MEDAL_COLORS[realRank - 1] }}>{realRank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Card title="榜单" status="live" stamp="每 10 秒刷新">
          {rows.length === 0 ? (
            <Empty text="暂无数据" />
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left font-medium">排名</th>
                  <th className="px-3 py-2.5 text-left font-medium">节点</th>
                  <th className="px-3 py-2.5 text-right font-medium">投资份额规模</th>
                  <th className="px-3 py-2.5 text-right font-medium">净盈亏</th>
                  <th className="px-3 py-2.5 text-right font-medium">参与周期</th>
                  <th className="px-3 py-2.5 text-right font-medium">结算胜率</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((r) => (
                  <tr key={r.rank} className="border-b border-gray-100 hover:bg-gray-100/30 transition-colors">
                    <td className="num px-3 py-2.5 text-gray-400">{r.rank}</td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {r.nickname}
                      {r.isBot && <span className="ml-1.5"><Badge tone="mute">流动性维护</Badge></span>}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-gray-500">{fmtInt(r.volume)}</td>
                    <td className={clsx("num px-3 py-2.5 text-right font-medium", r.profit >= 0 ? "text-success" : "text-danger")}>
                      {r.profit >= 0 ? "+" : ""}{fmtInt(r.profit)}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-gray-500">{r.rounds}</td>
                    <td className="num px-3 py-2.5 text-right text-primary">{fmtPct(r.winRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 border-t border-gray-200 pt-3 text-[10px] text-gray-500">
            榜单仅统计真实节点投资份额，生态流动性维护节点不参与排名。虚拟积分，仅供娱乐。
          </p>
        </Card>
      </div>
    </Shell>
  );
}
