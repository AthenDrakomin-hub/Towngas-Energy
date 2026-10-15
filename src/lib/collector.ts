import { and, desc, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { carResults, collectorRuns } from "@/db/schema";
import { getConfig } from "./config";
import { logTerminal } from "./logs";

type ApiRow = { onlinetime?: string; car?: unknown };

/** ES-77 的 onlinetime 为北京时间（UTC+8），统一换算为 UTC 后入库 */
const ES77_OFFSET_MS = 8 * 3600_000;

function parseOnlinetime(raw: string | undefined): Date | null {
  if (!raw) return null;
  const normalized = raw.trim().replace(" ", "T");
  const d = new Date(`${normalized.length === 16 ? `${normalized}:00` : normalized}Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() - ES77_OFFSET_MS);
}

function parseCarArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const arr = value.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  return arr.length >= 10 ? arr.slice(0, 10) : null;
}

/** 抓取 77tj API（生态数据源·ES-77）的 car 数组 */
export async function fetchApiData(url?: string): Promise<{ onlinetime: Date; car: number[] }[]> {
  const cfg = await getConfig();
  const target = url ?? cfg.collectorUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 CNX-AIoT-Node/2.0" },
    });
    if (!res.ok) throw new Error(`ES-77 HTTP ${res.status}`);
    const json = (await res.json()) as ApiRow[];
    if (!Array.isArray(json)) throw new Error("ES-77 响应结构异常");
    return json
      .map((row) => ({ onlinetime: parseOnlinetime(row.onlinetime), car: parseCarArray(row.car) }))
      .filter((r): r is { onlinetime: Date; car: number[] } => Boolean(r.onlinetime && r.car));
  } finally {
    clearTimeout(timer);
  }
}

/** 抓取主站页面：在线活跃度 + SHA512 链上验证凭证 */
export async function fetchPageData(url?: string): Promise<{ onlineCount: number | null; hashValue: string | null }> {
  const cfg = await getConfig();
  const target = url ?? cfg.collectorPageUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 CNX-AIoT-Node/2.0" },
    });
    if (!res.ok) throw new Error(`ES-77 页面 HTTP ${res.status}`);
    const html = await res.text();
    const hashMatch = html.match(/\b[a-f0-9]{128}\b/i);
    const numbers = html.match(/\b\d{1,3}(?:,\d{3})+\b/g) ?? [];
    const parsed = numbers.map((n) => Number(n.replace(/,/g, ""))).filter((n) => n > 1_000_000);
    return {
      onlineCount: parsed.length ? Math.max(...parsed) : null,
      hashValue: hashMatch ? hashMatch[0] : null,
    };
  } catch {
    return { onlineCount: null, hashValue: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function lastCarInWindow(start: Date, end: Date) {
  const rows = await db
    .select()
    .from(carResults)
    .where(and(gte(carResults.onlinetime, start), lt(carResults.onlinetime, end)))
    .orderBy(desc(carResults.onlinetime))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    onlinetime: row.onlinetime,
    car: row.car,
    onlineCount: row.onlineCount,
    hashValue: row.hashValue,
    source: row.source,
  };
}

export async function latestCar(limit = 1) {
  return db.select().from(carResults).orderBy(desc(carResults.onlinetime)).limit(limit);
}

/** 采集入库（按 onlinetime 去重） */
export async function runCollector(force = false): Promise<{
  inserted: number;
  fetched: number;
  onlineCount: number | null;
  hashValue: string | null;
  latencyMs: number;
  error: string | null;
}> {
  const started = Date.now();
  const state = globalThis as typeof globalThis & { __cnxLastCollect?: number };
  if (!force && state.__cnxLastCollect && Date.now() - state.__cnxLastCollect < 20000) {
    return { inserted: 0, fetched: 0, onlineCount: null, hashValue: null, latencyMs: 0, error: null };
  }
  state.__cnxLastCollect = Date.now();
  try {
    const rows = await fetchApiData();
    const page = await fetchPageData();
    let inserted = 0;
    for (const row of rows) {
      const res = await db
        .insert(carResults)
        .values({
          onlinetime: row.onlinetime,
          car: row.car,
          onlineCount: page.onlineCount,
          hashValue: page.hashValue,
        })
        .onConflictDoNothing({ target: carResults.onlinetime })
        .returning({ id: carResults.id });
      inserted += res.length;
    }
    const latencyMs = Date.now() - started;
    await db.insert(collectorRuns).values({ ok: true, records: rows.length, latencyMs });
    if (inserted > 0) {
      const newest = rows[0];
      await logTerminal(
        "info",
        "数据",
        `采集完成 | 指数=[${newest.car.join(",")}] | 活跃度=${(page.onlineCount ?? 0).toLocaleString("en-US")}`,
      );
    }
    return {
      inserted,
      fetched: rows.length,
      onlineCount: page.onlineCount,
      hashValue: page.hashValue,
      latencyMs,
      error: null,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message = err instanceof Error ? err.message : "采集异常";
    await db.insert(collectorRuns).values({ ok: false, records: 0, latencyMs, error: message });
    await logTerminal("warn", "数据", `采集失败 | ${message} | 启用缺口保护策略`);
    return { inserted: 0, fetched: 0, onlineCount: null, hashValue: null, latencyMs, error: message };
  }
}

export async function collectorHealth() {
  const runs = await db.select().from(collectorRuns).orderBy(desc(collectorRuns.startedAt)).limit(60);
  const total = runs.length;
  const okCount = runs.filter((r) => r.ok).length;
  const latest = runs[0];
  const [{ count: carCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(carResults);
  return {
    successRate: total ? okCount / total : 1,
    lastRunAt: latest?.startedAt ?? null,
    lastLatencyMs: latest?.latencyMs ?? 0,
    lastError: latest?.error ?? null,
    totalRecords: carCount ?? 0,
    recentRuns: runs.slice(0, 12),
  };
}

/** 缺失记录检测：近 6 小时每分钟应有一条 */
export async function missingWindows(hours = 6) {
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await db
    .select({ onlinetime: carResults.onlinetime })
    .from(carResults)
    .where(gte(carResults.onlinetime, since))
    .orderBy(desc(carResults.onlinetime));
  const present = new Set(rows.map((r) => r.onlinetime.getTime()));
  const gaps: string[] = [];
  const cursor = new Date(Math.floor(since.getTime() / 60_000) * 60_000);
  const end = Date.now();
  while (cursor.getTime() < end) {
    if (!present.has(cursor.getTime())) gaps.push(cursor.toISOString().replace("T", " ").slice(0, 16));
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return { expected: Math.floor((end - since.getTime()) / 60_000), collected: rows.length, gaps: gaps.slice(-40) };
}
