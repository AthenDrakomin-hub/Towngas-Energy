"use client";

import { useMemo } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Empty } from "@/components/ui/enterprise/Empty";

type HistoryRow = { onlinetime: string; car: number[] };

/**
 * CarChart — 能源指数走势图
 */
export function CarChart({ historyRows }: { historyRows: HistoryRow[] }) {
  const chartOption = useMemo<EChartsOption | null>(() => {
    if (!historyRows.length) return null;
    const cats = historyRows.map((r) => r.onlinetime.slice(11, 16));
    const composite = historyRows.map((r) => Number(r.car[9] ?? 0));
    const pv = historyRows.map((r) => Number(r.car[0] ?? 0));
    const sum = historyRows.map((r) => r.car.reduce((a, b) => a + Number(b), 0));
    const barColors = ["#a855f7", "#3b82f6", "#00a650", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];
    return {
      animationDuration: 150,
      backgroundColor: "transparent",
      grid: { left: 42, right: 12, top: 32, bottom: 22 },
      legend: {
        data: ["生态综合指数", "光伏出力", "和值"],
        textStyle: { color: "#6b7280", fontSize: 10 },
        itemWidth: 10,
        itemHeight: 6,
        top: 4,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#e5e7eb",
        textStyle: { color: "#1f2937", fontSize: 11 },
      },
      xAxis: { type: "category", data: cats, axisLine: { lineStyle: { color: "#e5e7eb" } }, axisLabel: { color: "#9ca3af", fontSize: 10 }, splitLine: { show: false } },
      yAxis: { type: "value", scale: true, axisLine: { show: false }, axisLabel: { color: "#9ca3af", fontSize: 10 }, splitLine: { lineStyle: { color: "#f3f4f6" } } },
      series: [
        {
          name: "生态综合指数",
          type: "bar",
          data: composite,
          barWidth: "50%",
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (params: any) => barColors[params.dataIndex % barColors.length],
          },
        },
        {
          name: "光伏出力",
          type: "line",
          data: pv,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#00a650", width: 2 },
          areaStyle: { color: "rgba(0,166,80,0.08)" },
        },
        {
          name: "和值",
          type: "line",
          data: sum,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#f5a623", width: 1.5, type: "dashed" },
        },
      ],
    };
  }, [historyRows]);

  return (
    <Card title="能源指数走势" status="live" stamp={`${historyRows.length} 根`} right={<Badge tone="mute">MA / MACD / RSI</Badge>}>
      {chartOption ? <EChart option={chartOption} height={260} /> : <Empty text="等待 ES-77 时序数据..." />}
    </Card>
  );
}
