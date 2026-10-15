"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, Empty, Metric } from "@/components/ui/Panel";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";
import { EChart, AXIS_STYLE } from "@/components/EChart";
import type { EChartsOption } from "echarts";
import { fmtInt, fmtPct } from "@/lib/format";

type Overview = {
  supply: { total: number; holders: number };
  inPlay: { open: number; openBets: number };
  rake: number;
  granted: number;
  inflation: number;
  topHolders: { nickname: string; balance: number; role: string }[];
  daily: { day: string; grants: number; rake: number }[];
  config: Record<string, number>;
};

export default function AdminPoints() {
  const [msg, setMsg] = useState<string | null>(null);
  const [cfg, setCfg] = useState<Record<string, number> | null>(null);
  const [names, setNames] = useState("demo");
  const [amount, setAmount] = useState(5000);
  const [remark, setRemark] = useState("");

  const ov = useQuery({
    queryKey: ["ad-points"],
    queryFn: async () => (await fetch("/api/admin/points/overview")).json(),
    refetchInterval: 15000,
  });
  const data: Overview | undefined = ov.data?.data;
  const current = cfg ?? data?.config ?? null;

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 4000);
  };

  const post = async (action: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/points/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    flash(json.ok ? `${action} 完成` : json.message);
    ov.refetch();
  };

  const daily = data?.daily ?? [];
  const option: EChartsOption | null = daily.length
    ? {
        backgroundColor: "transparent",
        grid: { left: 56, right: 14, top: 30, bottom: 26 },
        legend: { data: ["发放", "回收"], textStyle: { color: "#6b7280", fontSize: 11 }, top: 2 },
        tooltip: { trigger: "axis", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#e5e7eb", textStyle: { fontSize: 11, color: "#1f2937" } },
        xAxis: { type: "category", data: daily.map((d) => d.day), ...AXIS_STYLE },
        yAxis: { type: "value", ...AXIS_STYLE },
        series: [
          { name: "发放", type: "bar", data: daily.map((d) => d.grants), itemStyle: { color: "#29c4a9", borderRadius: [3, 3, 0, 0] } },
          { name: "回收", type: "bar", data: daily.map((d) => d.rake), itemStyle: { color: "#f0b90b", borderRadius: [3, 3, 0, 0] } },
        ],
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">积分控制台</h1>
        {msg && <Badge tone="warning">{msg}</Badge>}
        <Badge tone="mute">虚拟积分 · 仅供娱乐</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          { label: "积分总量", value: fmtInt(data?.supply?.total), tone: "text-warning" },
          { label: "持有节点", value: fmtInt(data?.supply?.holders), tone: "text-gray-600" },
          { label: "在池投资份额", value: fmtInt(data?.inPlay?.open), tone: "text-gray-800" },
          { label: "在池笔数", value: fmtInt(data?.inPlay?.openBets), tone: "text-gray-600" },
          { label: "累计回收", value: fmtInt(data?.rake), tone: "text-warning" },
          { label: "回收率", value: fmtPct(Math.abs(data?.inflation ?? 0)), tone: "text-danger" },
        ].map((m) => (
          <div key={m.label} className="glass rounded-xl p-4">
            <div className="label">{m.label}</div>
            <div className={`num mt-1 text-lg font-bold ${m.tone}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="发行 / 回收（按日）" status="live">
          {option ? <EChart option={option} height={260} /> : <Empty />}
        </Card>

        <Card title="积分配置" status="idle">
          {!current ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {(
                [
                  ["newPlayerGrant", "新节点发放"],
                  ["dailySigninReward", "每日签到"],
                  ["minBet", "最小投资份额"],
                  ["maxBetPerRound", "单周期上限"],
                  ["maxDailyStake", "每日上限"],
                  ["sessionReminderMinutes", "提醒间隔(分)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">{label}</span>
                  <input
                    type="number"
                    value={Number(cfg ? cfg[key] : current[key])}
                    onChange={(e) => setCfg({ ...(cfg ?? current), [key]: Number(e.target.value) })}
                    className="num w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-xs text-gray-800 outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">服务费率</span>
                <input
                  type="number"
                  step="0.01"
                  value={Number(cfg ? cfg.rakeRate : current.rakeRate)}
                  onChange={(e) => setCfg({ ...(cfg ?? current), rakeRate: Number(e.target.value) })}
                  className="num w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-xs text-gray-800 outline-none focus:border-primary"
                />
              </div>
              <Button variant="primary" className="w-full" onClick={() => post("config", { config: cfg })}>保存积分配置</Button>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="批量发放 / 手动回收" status="warn">
          <div className="space-y-3">
            <Input label="节点编号（逗号分隔）" value={names} onChange={(e) => setNames(e.target.value)} />
            <Input type="number" label="数量（负数为回收）" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <Input label="备注" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="可选" />
            <div className="flex gap-2">
              <Button
                variant={amount >= 0 ? "success" : "danger"}
                className="flex-1"
                onClick={() => post(amount >= 0 ? "batch-grant" : "deduct", { usernames: names.split(",").map((s) => s.trim()).filter(Boolean), amount: Math.abs(amount), remark })}
              >
                {amount >= 0 ? "批量发放" : "手动回收"}
              </Button>
              <Button variant="ghost" onClick={() => setAmount(-Math.abs(amount))}>切换为回收</Button>
            </div>
            <p className="text-[10px] text-gray-400">所有操作写入 ledger_entries 与 admin_logs，可追溯。</p>
          </div>
        </Card>

        <Card title="持币 TOP" status="live">
          <div className="space-y-2.5">
            {(data?.topHolders ?? []).map((h, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs">
                  <span className="truncate text-gray-800">
                    {h.nickname} <span className="text-[10px] text-gray-400">{h.role === "user" ? "用户" : h.role === "bot" ? "流动性维护" : h.role === "admin" ? "管理员" : h.role}</span>
                  </span>
                  <span className="num text-warning font-medium">{fmtInt(h.balance)}</span>
                </div>
                <Bar value={h.balance / Math.max(1, data?.topHolders?.[0]?.balance ?? 1)} tone="gold" height={4} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
