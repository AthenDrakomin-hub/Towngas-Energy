"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Bar, Empty, Metric } from "@/components/ui/Panel";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { EChart, AXIS_STYLE } from "@/components/EChart";
import type { EChartsOption } from "echarts";
import { fmtInt, fmtPct, RESULT_LABEL } from "@/lib/format";
import { StatCard, Tag } from "@/components/ui/enterprise";

const STATUS_LABEL: Record<string, string> = {
  betting: "投资中",
  locked: "已锁定",
  settling: "结算中",
  settled: "已结算",
  active: "运行中",
  pending: "待开始",
};

function statusLabel(s?: string) {
  if (!s) return "--";
  return STATUS_LABEL[s] ?? s;
}

export default function AdminDashboard() {
  const realtime = useQuery({
    queryKey: ["ad-realtime"],
    queryFn: async () => (await fetch("/api/admin/dashboard/realtime")).json(),
    refetchInterval: 3000,
  });
  const users = useQuery({
    queryKey: ["ad-users"],
    queryFn: async () => (await fetch("/api/admin/dashboard/users")).json(),
    refetchInterval: 30000,
  });
  const bets = useQuery({
    queryKey: ["ad-bets"],
    queryFn: async () => (await fetch("/api/admin/dashboard/bets")).json(),
    refetchInterval: 30000,
  });
  const revenue = useQuery({
    queryKey: ["ad-revenue"],
    queryFn: async () => (await fetch("/api/admin/dashboard/revenue")).json(),
    refetchInterval: 30000,
  });
  const alerts = useQuery({
    queryKey: ["ad-alerts"],
    queryFn: async () => (await fetch("/api/admin/dashboard/alerts")).json(),
    refetchInterval: 20000,
  });

  const r = realtime.data?.data;
  const round = r?.round;

  const revRows: { day: string; rake: number; pool: number }[] = revenue.data?.data?.rows ?? [];
  const revOption: EChartsOption | null = revRows.length
    ? {
        backgroundColor: "transparent",
        grid: { left: 52, right: 14, top: 26, bottom: 26 },
        legend: { data: ["服务费回收", "流动性池"], textStyle: { color: "#6b7280", fontSize: 10 }, top: 2 },
        tooltip: { trigger: "axis", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#e5e7eb", textStyle: { fontSize: 11, color: "#1f2937" } },
        xAxis: { type: "category", data: revRows.map((x) => x.day), axisLine: { lineStyle: { color: "#e5e7eb" } }, axisLabel: { color: "#9ca3af", fontSize: 10 }, splitLine: { show: false } },
        yAxis: { type: "value", axisLine: { show: false }, axisLabel: { color: "#9ca3af", fontSize: 10 }, splitLine: { lineStyle: { color: "#f3f4f6" } } },
        series: [
          { name: "服务费回收", type: "bar", data: revRows.map((x) => x.rake), itemStyle: { color: "#f5a623", borderRadius: [4, 4, 0, 0] } },
          { name: "流动性池", type: "line", data: revRows.map((x) => x.pool), smooth: true, symbol: "none", lineStyle: { color: "#00a650", width: 2 } },
        ],
      }
    : null;

  const betRows: { hour: string; volume: number }[] = bets.data?.data?.hourly ?? [];
  const betOption: EChartsOption | null = betRows.length
    ? {
        backgroundColor: "transparent",
        grid: { left: 56, right: 14, top: 20, bottom: 26 },
        tooltip: { trigger: "axis", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#e5e7eb", textStyle: { fontSize: 11, color: "#1f2937" } },
        xAxis: { type: "category", data: betRows.map((x) => x.hour), axisLine: { lineStyle: { color: "#e5e7eb" } }, axisLabel: { color: "#9ca3af", fontSize: 10 }, splitLine: { show: false } },
        yAxis: { type: "value", axisLine: { show: false }, axisLabel: { color: "#9ca3af", fontSize: 10 }, splitLine: { lineStyle: { color: "#f3f4f6" } } },
        series: [{ type: "bar", data: betRows.map((x) => x.volume), itemStyle: { color: "#00a650", borderRadius: [4, 4, 0, 0] } }],
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">数据看板</h1>
        <Badge tone="success" dot>引擎运行中</Badge>
        <Badge tone="primary">ES-77 {r?.car?.onlinetime?.slice(11, 19) ?? "--"}</Badge>
        <span className="ml-auto text-[10px] text-gray-400">每 3 秒刷新 · 管理端数据不向客户端推送</span>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="当前周期" value={round?.code ?? "--"} color="blue" icon="🎯" />
        <StatCard label="周期状态" value={statusLabel(round?.status)} color="green" icon="⚡" />
        <StatCard label="总池" value={fmtInt(round?.totalPool)} color="orange" icon="💰" />
        <StatCard label="看多池" value={fmtInt(round?.upPool)} color="green" icon="📈" />
        <StatCard label="看空池" value={fmtInt(round?.downPool)} color="red" icon="📉" />
        <StatCard label="服务费" value={fmtInt(round?.rakeAmount)} color="pink" icon="💎" />
      </div>

      {/* 三栏状态 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="四大平台状态" status="live">
          <div className="space-y-2">
            {(r?.platforms ?? []).map((p: { name: string; state: string; detail: string }) => (
              <div key={p.name} className="flex items-center gap-2 border-b border-gray-100 pb-2 last:border-0">
                <span className="w-14 shrink-0 text-xs font-semibold text-gray-800">{p.name}</span>
                <Badge tone="success" dot>{p.state}</Badge>
                <span className="min-w-0 flex-1 truncate text-[10px] text-gray-500">{p.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3">
            <Metric label="注册用户" value={fmtInt(r?.nodes?.total)} tone="mute" />
            <Metric label="活跃用户" value={fmtInt(r?.nodes?.active)} tone="up" />
            <Metric label="冻结" value={fmtInt(r?.nodes?.banned)} tone="down" />
            <Metric label="影子封禁" value={fmtInt(r?.nodes?.shadow)} tone="gold" />
          </div>
        </Card>

        <Card title="用户增长 / 活跃" status="live">
          <div className="space-y-3">
            <div>
              <div className="label mb-1">每日新增用户</div>
              <div className="flex h-10 items-end gap-1">
                {(users.data?.data?.growth ?? []).map((g: { day: string; signups: number }) => (
                  <div key={g.day} className="flex-1 rounded-t bg-success/70" style={{ height: `${Math.min(100, g.signups * 8 + 8)}%` }} title={`${g.day} ${g.signups}`} />
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-1">每日活跃用户</div>
              <div className="flex h-10 items-end gap-1">
                {(users.data?.data?.active ?? []).map((g: { day: string; actives: number }) => (
                  <div key={g.day} className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.min(100, g.actives * 8 + 8)}%` }} title={`${g.day} ${g.actives}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-gray-200 pt-3">
              <Metric label="真实节点" value={fmtInt(users.data?.data?.totals?.nodes)} size="sm" />
              <Metric label="流动性维护节点" value={fmtInt(users.data?.data?.totals?.bots)} size="sm" tone="mute" />
              <Metric label="管理员" value={fmtInt(users.data?.data?.totals?.admins)} size="sm" tone="blue" />
            </div>
          </div>
        </Card>

        <Card title="投资份额分析" status="live">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="累计投资份额" value={fmtInt(bets.data?.data?.agg?.volume)} />
            <Metric label="累计笔数" value={fmtInt(bets.data?.data?.agg?.count)} tone="mute" />
            <Metric label="平均单笔" value={fmtInt(bets.data?.data?.agg?.avg)} tone="mute" />
            <Metric label="大注占比" value={fmtPct(bets.data?.data?.agg?.count ? (bets.data.data.agg.large ?? 0) / bets.data.data.agg.count : 0)} tone="gold" />
          </div>
          <div className="mt-4 space-y-2">
            {(bets.data?.data?.distribution ?? []).map((d: { result: string | null; volume: number; count: number }) => (
              <div key={d.result ?? "open"}>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{RESULT_LABEL[d.result ?? ""] ?? "进行中"}</span>
                  <span className="num">{fmtInt(d.volume)} · {d.count} 笔</span>
                </div>
                <Bar value={(d.volume ?? 0) / Math.max(1, bets.data?.data?.agg?.volume ?? 1)} tone={d.result === "up" ? "up" : d.result === "down" ? "down" : "gold"} height={4} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 图表 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="服务费收入 / 积分回收" status="live">
          {revOption ? <EChart option={revOption} height={240} /> : <Empty />}
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-gray-200 pt-3">
            <Metric label="累计回收" value={fmtInt(revenue.data?.data?.total?.rake)} tone="gold" />
            <Metric label="累计池" value={fmtInt(revenue.data?.data?.total?.pool)} tone="mute" />
            <Metric label="负期望" value={fmtPct(revenue.data?.data?.negativeExpectation, 0)} tone="down" />
          </div>
        </Card>
        <Card title="投资份额时序（近 24h）" status="live">
          {betOption ? <EChart option={betOption} height={240} /> : <Empty />}
        </Card>
      </div>

      {/* 异常告警 */}
      <Card title="异常告警" status="warn">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="label mb-2">数据缺口周期</div>
            <div className="space-y-1 text-xs">
              {(alerts.data?.data?.gaps ?? []).map((g: { code: string }) => (
                <div key={g.code} className="num text-warning">{g.code}</div>
              ))}
              {!(alerts.data?.data?.gaps ?? []).length && <span className="text-success">无</span>}
            </div>
          </div>
          <div>
            <div className="label mb-2">管理端覆盖周期</div>
            <div className="space-y-1 text-xs">
              {(alerts.data?.data?.overrides ?? []).map((g: { code: string }) => (
                <div key={g.code} className="num text-primary">{g.code}</div>
              ))}
              {!(alerts.data?.data?.overrides ?? []).length && <span className="text-success">无</span>}
            </div>
          </div>
          <div>
            <div className="label mb-2">大额投资份额 TOP</div>
            <div className="space-y-1 text-xs text-gray-500">
              {(alerts.data?.data?.whales ?? []).map((w: { nickname: string; amount: number }, i: number) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="truncate">{w.nickname}</span>
                  <span className="num text-gray-800">{fmtInt(w.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
