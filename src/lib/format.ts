export function fmtInt(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return Math.round(v).toLocaleString("en-US");
}

export function fmtSigned(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString("en-US")}`;
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  return `${(Number(n ?? 0) * 100).toFixed(digits)}%`;
}

export function fmtX(n: number | null | undefined, digits = 2): string {
  return `${Number(n ?? 0).toFixed(digits)}x`;
}

export function pad(n: number, len = 2): string {
  return String(Math.floor(Math.abs(n))).padStart(len, "0");
}

export function clockOf(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function hhmm(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** 周期编号：YYYYMMDD-NNNN（每日 288 个） */
export function roundCodeOf(start: Date): string {
  const y = start.getUTCFullYear();
  const m = pad(start.getUTCMonth() + 1);
  const d = pad(start.getUTCDate());
  const seq = Math.floor((start.getUTCHours() * 60 + start.getUTCMinutes()) / 5) + 1;
  return `${y}${m}${d}-${String(seq).padStart(4, "0")}`;
}

export function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function countdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

export const RESULT_LABEL: Record<string, string> = {
  up: "看多 ▲",
  down: "看空 ▼",
  draw: "平局 —",
  void: "数据缺口 · 退还",
};
