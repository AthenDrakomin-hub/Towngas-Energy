"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, GaugeChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// 按需注册图表模块，减小打包体积
echarts.use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
]);

export type EChartsOption = echarts.EChartsCoreOption;

export function EChart({
  option,
  height = 220,
  className,
}: {
  option: EChartsOption;
  height?: number;
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!holder.current) return;
    const instance = echarts.init(holder.current, undefined, { renderer: "canvas" });
    chart.current = instance;
    const onResize = () => instance.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);

  return <div ref={holder} className={className} style={{ height, width: "100%" }} />;
}

export const AXIS_STYLE = {
  axisLine: { lineStyle: { color: "#e5e7eb" } },
  axisLabel: { color: "#9ca3af", fontSize: 10, fontFamily: "JetBrains Mono, monospace" },
  splitLine: { lineStyle: { color: "#f3f4f6" } },
} as const;
