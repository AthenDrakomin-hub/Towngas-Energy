import type { EChartsOption } from "echarts";

/**
 * 港华智慧能源 ECharts 品牌主题 — 浅色企业风格
 * 统一所有图表的配色、坐标轴、tooltip、网格样式
 */

export const CHART_COLORS = {
  primary: "#00a650",
  success: "#00a650",
  danger: "#ff4d4f",
  warning: "#f5a623",
  info: "#1890ff",
  purple: "#a855f7",
  pink: "#ec4899",
  orange: "#f59e0b",
  cyan: "#06b6d4",
};

export const AXIS_STYLE = {
  axisLine: { lineStyle: { color: "#e5e7eb" } },
  axisTick: { show: false },
  axisLabel: { color: "#9ca3af", fontSize: 10 },
  splitLine: { lineStyle: { color: "#f3f4f6", type: "solid" as const } },
};

export const TOOLTIP_STYLE = {
  backgroundColor: "rgba(255, 255, 255, 0.98)",
  borderColor: "#e5e7eb",
  borderWidth: 1,
  textStyle: { color: "#1f2937", fontSize: 11 },
  extraCssText: "border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);",
};

export const LEGEND_STYLE = {
  textStyle: { color: "#6b7280", fontSize: 11 },
  itemWidth: 12,
  itemHeight: 8,
  itemGap: 16,
};

export const GRID_STYLE = {
  left: 48,
  right: 16,
  top: 24,
  bottom: 28,
  containLabel: false,
};

/** 基础折线图配置 */
export function lineChart(overrides: Partial<EChartsOption> = {}): EChartsOption {
  return {
    backgroundColor: "transparent",
    color: [CHART_COLORS.primary, CHART_COLORS.info, CHART_COLORS.warning, CHART_COLORS.danger],
    grid: GRID_STYLE,
    tooltip: { trigger: "axis", ...TOOLTIP_STYLE },
    xAxis: { type: "category", ...AXIS_STYLE },
    yAxis: { type: "value", ...AXIS_STYLE },
    ...overrides,
  };
}

/** 基础柱状图配置 */
export function barChart(overrides: Partial<EChartsOption> = {}): EChartsOption {
  return {
    backgroundColor: "transparent",
    color: [CHART_COLORS.primary, CHART_COLORS.info, CHART_COLORS.warning],
    grid: { ...GRID_STYLE, left: 56 },
    tooltip: { trigger: "axis", ...TOOLTIP_STYLE },
    xAxis: { type: "category", ...AXIS_STYLE },
    yAxis: { type: "value", ...AXIS_STYLE },
    ...overrides,
  };
}

/** K线图配置 */
export function candlestickChart(overrides: Partial<EChartsOption> = {}): EChartsOption {
  return {
    backgroundColor: "transparent",
    grid: GRID_STYLE,
    tooltip: { trigger: "axis", ...TOOLTIP_STYLE },
    xAxis: { type: "category", ...AXIS_STYLE },
    yAxis: { type: "value", scale: true, ...AXIS_STYLE },
    ...overrides,
  };
}

/** 仪表盘/环形图配置 */
export function gaugeChart(overrides: Partial<EChartsOption> = {}): EChartsOption {
  return {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        radius: "90%",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 8,
            color: [
              [0.3, "#ff4d4f"],
              [0.7, "#f5a623"],
              [1, "#00a650"],
            ],
          },
        },
        pointer: { itemStyle: { color: "#00a650" }, width: 3 },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 24,
          fontWeight: "bold",
          color: "#1f2937",
          formatter: "{value}%",
          offsetCenter: [0, "30%"],
        },
        data: [{ value: 0 }],
      },
    ],
    ...overrides,
  };
}
