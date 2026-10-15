/** 格式化整数，加千分位 */
export function fmtInt(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "0";
  return Math.floor(num).toLocaleString("zh-CN");
}

/** 格式化金额，保留2位小数 */
export function fmtMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0.00";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}

/** 格式化日期 */
export function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN");
}

/** 格式化日期时间 */
export function fmtDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("zh-CN");
}
