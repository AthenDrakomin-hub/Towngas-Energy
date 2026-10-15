"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Empty, Metric, Tabs } from "@/components/ui/Panel";
import { Button } from "@/components/ui/form/Button";
import { Modal } from "@/components/ui/feedback/Modal";
import { EChart, AXIS_STYLE } from "@/components/EChart";
import type { EChartsOption } from "echarts";
import { fmtInt, RESULT_LABEL } from "@/lib/format";
import { Table, Tag } from "@/components/ui/enterprise";

type RoundRow = {
  id: number;
  code: string;
  startTime: string;
  status: string;
  totalPool: number;
  upPool: number;
  downPool: number;
  result: string | null;
  resultSource: string | null;
  settleCar: number[] | null;
  rakeAmount: number;
  participants: number;
};

export default function HistoryPage() {
  const [tab, setTab] = useState<"list" | "stats">("list");
  const [open, setOpen] = useState<number | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["round-history"],
    queryFn: async () => (await fetch("/api/rounds/history?limit=120")).json(),
    refetchInterval: 12000,
  });
  const { data: carHist } = useQuery({
    queryKey: ["car-history-page"],
    queryFn: async () => (await fetch("/api/car/history?limit=240")).json(),
    refetchInterval: 20000,
  });
  const detail = useQuery({
    queryKey: ["round-detail", open],
    enabled: open != null,
    queryFn: async () => (await fetch(`/api/rounds/${open}`)).json(),
  });

  const rows: RoundRow[] = data?.data ?? [];
  const carRows: { onlinetime: string; car: number[] }[] = carHist?.data?.rows ?? [];

  const stats = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.result === "up") acc.up += 1;
      if (r.result === "down") acc.down += 1;
      if (r.result === "draw") acc.draw += 1;
      acc.pool += r.totalPool;
      acc.rake += r.rakeAmount;
      return acc;
    },
    { total: 0, up: 0, down: 0, draw: 0, pool: 0, rake: 0 },
  );

  const option: EChartsOption | null = carRows.length
    ? {
        backgroundColor: "transparent",
        grid: { left: 44, right: 14, top: 24, bottom: 24 },
        tooltip: { trigger: "axis", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#e5e7eb", textStyle: { fontSize: 11, color: "#1f2937" } },
        xAxis: { type: "category", data: carRows.map((r) => r.onlinetime.slice(11, 16)), ...AXIS_STYLE },
        yAxis: { type: "value", scale: true, ...AXIS_STYLE },
        series: [
          {
            name: "生态综合指数",
            type: "candlestick",
            data: carRows.map((r, i, arr) => {
              const prev = i > 0 ? Number(arr[i - 1].car[9]) : Number(r.car[9]);
              const cur = Number(r.car[9]);
              return [prev, cur, Math.min(prev, cur) - 0.4, Math.max(prev, cur) + 0.4];
            }),
            itemStyle: { color: "#29c4a9", color0: "#ff4d6a", borderColor: "#29c4a9", borderColor0: "#ff4d6a" },
          },
        ],
      }
    : null;

  return (
    <Shell>
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">历史周期</h1>
          <Tabs
            items={[{ key: "list", label: "周期列表" }, { key: "stats", label: "EEI 走势" }]}
            value={tab}
            onChange={setTab}
          />
          <a
            href="/api/car/history?limit=1440"
            className="ml-auto"
          >
            <Button variant="secondary" size="sm">导出 EEI 序列</Button>
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            { label: "周期数", value: fmtInt(stats.total), tone: "mute" as const },
            { label: "看多", value: fmtInt(stats.up), tone: "up" as const },
            { label: "看空", value: fmtInt(stats.down), tone: "down" as const },
            { label: "平局", value: fmtInt(stats.draw), tone: "gold" as const },
            { label: "累计池", value: fmtInt(stats.pool), tone: "mute" as const },
            { label: "累计服务费", value: fmtInt(stats.rake), tone: "mute" as const },
          ].map((m) => (
            <div key={m.label} className="glass rounded-xl p-4">
              <div className="label">{m.label}</div>
              <div className={clsx("num mt-1 text-xl font-bold", m.tone === "up" ? "text-success" : m.tone === "down" ? "text-danger" : m.tone === "gold" ? "text-warning" : "text-gray-800")}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {tab === "stats" ? (
          <Card title="EEI 走势 · K线" status="live">
            {option ? <EChart option={option} height={360} /> : <Empty />}
          </Card>
        ) : (
          <Card title="周期列表" status="live" stamp={`${rows.length} 条`}>
            <div className="max-h-[560px] overflow-auto">
              <Table<RoundRow>
                columns={[
                  { key: "code", title: "周期", render: (r) => <span className="num font-medium">{r.code}</span> },
                  { key: "startTime", title: "时间", render: (r) => <span className="num">{r.startTime.slice(11, 16)}</span> },
                  { key: "upPool", title: "看多池", align: "right", render: (r) => <span className="num text-[#00a650]">{fmtInt(r.upPool)}</span> },
                  { key: "downPool", title: "看空池", align: "right", render: (r) => <span className="num text-[#ff4d4f]">{fmtInt(r.downPool)}</span> },
                  { key: "totalPool", title: "总池", align: "right", render: (r) => <span className="num">{fmtInt(r.totalPool)}</span> },
                  { key: "rakeAmount", title: "服务费", align: "right", render: (r) => <span className="num text-gray-500">{fmtInt(r.rakeAmount)}</span> },
                  { key: "result", title: "结果", render: (r) => <Tag color={r.result === "up" ? "green" : r.result === "down" ? "red" : "orange"}>{RESULT_LABEL[r.result ?? ""] ?? "进行中"}</Tag> },
                  { key: "settleCar", title: "开奖号码", render: (r) => <span className="num text-gray-500">{(r.settleCar ?? []).join(",") || "--"}</span> },
                  { key: "resultSource", title: "来源", render: (r) => <span className="text-gray-500">{r.resultSource ?? "--"}</span> },
                ]}
                data={rows}
                rowKey={(r) => r.id}
                onRowClick={(r) => setOpen(r.id)}
                emptyText={isLoading ? "读取中..." : "暂无数据"}
              />
            </div>
          </Card>
        )}
      </div>

      <Modal open={open != null} onClose={() => setOpen(null)} title="周期详情 · 数据流回放" size="lg">
        {detail.isLoading && <div className="py-8 text-center text-sm text-gray-500">载入中...</div>}
        {detail.data?.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="结果" value={RESULT_LABEL[detail.data.data.round.result] ?? "--"} tone="gold" />
              <Metric label="总池" value={fmtInt(detail.data.data.round.totalPool)} />
              <Metric label="服务费" value={fmtInt(detail.data.data.round.rakeAmount)} tone="mute" />
              <Metric label="参与节点" value={fmtInt(detail.data.data.round.participants)} tone="mute" />
            </div>
            <div>
              <div className="label mb-1">清算依据</div>
              <pre className="overflow-auto rounded-lg bg-white p-3 font-mono text-[10.5px] text-gray-500">
                {JSON.stringify({ round: detail.data.data.round.code, settlement: detail.data.data.settlement, analysis: detail.data.data.analysis }, null, 2)}
              </pre>
            </div>
            <div>
              <div className="label mb-1">投资份额分布</div>
              <div className="flex flex-wrap gap-2">
                {(detail.data.data.distribution ?? []).map((d: { side: string; stake: number; nodes: number }) => (
                  <Badge key={d.side} tone={d.side === "up" ? "success" : "danger"}>
                    {d.side === "up" ? "看多" : "看空"} {fmtInt(d.stake)} · {d.nodes} 节点
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-1">窗口内采集记录</div>
              <div className="max-h-40 overflow-auto rounded-lg bg-white p-3 font-mono text-[10.5px]">
                {(detail.data.data.window ?? []).map((w: { onlinetime: string; car: number[] }) => (
                  <div key={w.onlinetime} className="text-gray-500">
                    {w.onlinetime.slice(11, 19)} │ 指数=[{w.car.join(",")}]
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
