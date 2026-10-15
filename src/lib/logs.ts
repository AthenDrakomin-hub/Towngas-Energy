import { desc, eq, and, gte, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { terminalLogs } from "@/db/schema";

export type LogLevel = "info" | "warn" | "error" | "debug" | "data";

export async function logTerminal(level: LogLevel, module: string, message: string) {
  try {
    await db.insert(terminalLogs).values({ level, module, message });
  } catch {
    // 日志失败不影响主流程
  }
}

export async function logMany(rows: { level: LogLevel; module: string; message: string }[]) {
  if (!rows.length) return;
  try {
    await db.insert(terminalLogs).values(rows);
  } catch {
    // 忽略
  }
}

export async function queryLogs(opts: {
  limit?: number;
  level?: string;
  keyword?: string;
  sinceMinutes?: number;
}) {
  const limit = Math.min(opts.limit ?? 80, 400);
  const conditions = [];
  if (opts.level && opts.level !== "all") conditions.push(eq(terminalLogs.level, opts.level));
  if (opts.keyword) conditions.push(like(terminalLogs.message, `%${opts.keyword}%`));
  if (opts.sinceMinutes) {
    conditions.push(gte(terminalLogs.ts, new Date(Date.now() - opts.sinceMinutes * 60_000)));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(terminalLogs)
    .where(where)
    .orderBy(desc(terminalLogs.id))
    .limit(limit);
  return rows;
}

export async function pruneLogs(keep = 4000) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(terminalLogs);
  if (count <= keep) return 0;
  const cutoff = await db
    .select({ id: terminalLogs.id })
    .from(terminalLogs)
    .orderBy(desc(terminalLogs.id))
    .limit(1)
    .offset(keep - 1);
  const boundary = cutoff[0]?.id;
  if (!boundary) return 0;
  const res = await db.delete(terminalLogs).where(sql`${terminalLogs.id} < ${boundary}`);
  return res.rowCount ?? 0;
}
