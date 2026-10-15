"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Empty, Metric } from "@/components/ui/Panel";
import { EChart, AXIS_STYLE } from "@/components/EChart";
import type { EChartsOption } from "echarts";
import { fmtPct } from "@/lib/format";

export default function SignalPage() {
  const { data: current } = useQuery({
    queryKey: ["sig-current"],
    queryFn: async () => (await fetch("/api/signal/current")).json(),
    refetchInterval: 5000,
  });
  const { data: history } = useQuery({
    queryKey: ["sig-history"],
    queryFn: async () => (await fetch("/api/signal/history")).json(),
    refetchInterval: 15000,
  });
  const { data: model } = useQuery({
    queryKey: ["sig-model"],
    queryFn: async () => (await fetch("/api/signal/model")).json(),
  });

  const rows: { roundCode: string; direction: string; confidence: number; result: string }[] = history?.data ?? [];
  const option: EChartsOption | null = rows.length
    ? {
        backgroundColor: "transparent",
        grid: { left: 40, right: 14, top: 24, bottom: 40 },
        tooltip: { trigger: "axis", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#e5e7eb", textStyle: { fontSize: 11, color: "#1f2937" } },
        xAxis: { type: "category", data: rows.map((r) => r.roundCode.slice(-4)).reverse(), ...AXIS_STYLE, axisLabel: { ...AXIS_STYLE.axisLabel, rotate: 45 } },
        yAxis: { type: "value", min: 40, max: 90, ...AXIS_STYLE },
        series: [
          {
            name: "置信度",
            type: "line",
            data: rows.map((r) => Number(r.confidence.toFixed(1))).reverse(),
            smooth: true,
            symbol: "circle",
            symbolSize: 4,
            lineStyle: { color: "#2ea3f2", width: 1.4 },
            areaStyle: { color: "rgba(46,163,242,0.10)" },
          },
        ],
      }
    : null;

  const sig = current?.data;

  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">能源指数研判</h1>
          <Badge tone="primary" dot>五因子综合评分</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="实时信号" status="idle" right={<Badge tone="primary">推理链路</Badge>}>
            <div
              className={clsx(
                "num text-4xl font-bold",
                sig?.direction === "up" ? "text-success" : sig?.direction === "down" ? "text-danger" : "text-gray-400",
              )}
            >
              {sig?.direction === "up" ? "▲ 看多" : sig?.direction === "down" ? "▼ 看空" : "— 观望"}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="置信度" value={`${(sig?.confidence ?? 0).toFixed(1)}%`} tone="blue" />
              <Metric label="推理耗时" value={`${(sig?.latencyMs ?? 0).toFixed(1)}ms`} tone="mute" />
            </div>
            <div className="mt-4 space-y-2">
              {(sig?.factors ?? []).map((f: { label: string; value: number }) => (
                <div key={f.label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[10px] text-gray-500">├─ {f.label}</span>
                  <span className={clsx("num w-12 text-right text-[11px]", f.value >= 0 ? "text-success" : "text-danger")}>
                    {f.value >= 0 ? "+" : ""}{f.value.toFixed(2)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className={clsx("h-full rounded-full", f.value >= 0 ? "bg-success" : "bg-danger")} style={{ width: `${Math.min(100, Math.abs(f.value) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-gray-200 pt-3 text-xs leading-relaxed text-gray-500">{sig?.template ?? ""}</p>
          </Card>

          <Card title="模型详情" status="live">
            <div className="space-y-2.5 text-xs">
              {[
                ["模型名称", model?.data?.name ?? "五因子综合评分"],
                ["参数规模", model?.data?.params ?? "7.2B"],
                ["推理框架", model?.data?.framework ?? "星云分布式推理集群"],
                ["训练语料", model?.data?.trainingCorpus ?? "指数时序归档"],
                ["历史准确率", `${model?.data?.displayAccuracy ?? 51.3}%`],
                ["真实回测", `${model?.data?.realAccuracy ? fmtPct(model.data.realAccuracy) : "--"} · 样本 ${model?.data?.sample ?? 0}`],
                ["回测窗口", model?.data?.windowLabel ?? "近 14 天演算周期"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-200/50 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="num text-gray-800">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-gray-500">
              五因子 = 动量 / 波动率 / 资金流 / 情绪 / 宏观。权重分别为 0.30 / 0.15 / 0.28 / 0.17 / 0.10。
              信号仅用于展示推理可解释性，不构成任何建议。
            </p>
          </Card>

          <Card title="置信度走势" status="live">
            {option ? <EChart option={option} height={280} /> : <Empty />}
          </Card>
        </div>

        <Card title="信号历史 · 与结算结果对照" status="live">
          <div className="max-h-[380px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white text-gray-500 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left font-medium">周期</th>
                  <th className="px-3 py-2.5 text-left font-medium">信号</th>
                  <th className="px-3 py-2.5 text-right font-medium">置信度</th>
                  <th className="px-3 py-2.5 text-left font-medium">结算结果</th>
                  <th className="px-3 py-2.5 text-left font-medium">判定</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const hit = r.direction === r.result;
                  return (
                    <tr key={r.roundCode} className="border-b border-gray-100 hover:bg-gray-100/30">
                      <td className="num px-3 py-2 text-gray-800">{r.roundCode}</td>
                      <td className={clsx("px-3 py-2", r.direction === "up" ? "text-success" : r.direction === "down" ? "text-danger" : "text-gray-500")}>
                        {r.direction === "up" ? "▲ 看多" : r.direction === "down" ? "▼ 看空" : "— 观望"}
                      </td>
                      <td className="num px-3 py-2 text-right text-primary">{r.confidence.toFixed(1)}%</td>
                      <td className={clsx("px-3 py-2", r.result === "up" ? "text-success" : r.result === "down" ? "text-danger" : "text-warning")}>
                        {r.result === "up" ? "看多" : r.result === "down" ? "看空" : "平局"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={hit ? "success" : "mute"}>{hit ? "命中" : "未命中"}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && <Empty />}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
