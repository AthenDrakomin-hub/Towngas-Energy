import { desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { carResults, rounds, signals } from "@/db/schema";
import { SIGNAL_MODEL } from "./constants";
import { seededUnit } from "./settlement";

export type Factor = { key: string; label: string; value: number };
export type SignalSnapshot = {
  roundCode: string;
  roundId: number;
  direction: "up" | "down" | "flat";
  confidence: number;
  factors: Factor[];
  latencyMs: number;
  accuracy: number;
  template: string;
};

/** 基于因子值动态生成研判文案，不再随机选模板 */
function buildTemplate(factors: Factor[], direction: "up" | "down" | "flat"): string {
  const sorted = [...factors].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const top = sorted[0];
  const second = sorted[1];
  const dirText = direction === "up" ? "偏多" : direction === "down" ? "偏空" : "中性";

  const factorDesc: Record<string, string> = {
    momentum: "绿电交易动量",
    volatility: "储能波动率",
    flow: "资金流向",
    sentiment: "碳市场情绪",
    macro: "宏观能效",
  };

  const topDesc = factorDesc[top.key] ?? top.label;
  const secondDesc = factorDesc[second.key] ?? second.label;
  const topVal = top.value > 0 ? "上行" : top.value < 0 ? "下行" : "平稳";
  const secondVal = second.value > 0 ? "支撑" : second.value < 0 ? "压制" : "中性";

  return `${topDesc}${topVal}，${secondDesc}${secondVal}，综合研判${dirText}。`;
}

/** 基于真实 指数时序计算五因子 */
export async function computeSignal(
  round: { id: number; code: string },
  marketBias: number,
  asOf?: Date,
): Promise<SignalSnapshot> {
  const started = Date.now();
  const history = asOf
    ? await db
        .select()
        .from(carResults)
        .where(lte(carResults.onlinetime, asOf))
        .orderBy(desc(carResults.onlinetime))
        .limit(24)
    : await db
        .select()
        .from(carResults)
        .orderBy(desc(carResults.onlinetime))
        .limit(24);
  const series = history.reverse();
  const composite = series.map((r) => Number(r.car[9] ?? 0));
  const online = series.map((r) => Number(r.onlineCount ?? 0));

  const diffs: number[] = [];
  for (let i = 1; i < composite.length; i += 1) diffs.push(composite[i] - composite[i - 1]);
  const momentum = diffs.length
    ? diffs.slice(-6).reduce((a, b) => a + b, 0) / (Math.abs(diffs.slice(-6).reduce((a, b) => a + b, 0)) + 6)
    : 0;

  const mean = composite.length ? composite.reduce((a, b) => a + b, 0) / composite.length : 0;
  const variance = composite.length
    ? composite.reduce((a, b) => a + (b - mean) ** 2, 0) / composite.length
    : 0;
  const volatility = -Math.min(1, Math.sqrt(variance) / 3.2);

  const flow = Math.max(-1, Math.min(1, marketBias));
  const sentimentRaw = online.length > 4 ? (online[online.length - 1] - online[0]) / Math.max(1, online[0]) : 0;
  const sentiment = Math.max(-1, Math.min(1, sentimentRaw * 26));
  const macro = (seededUnit(`${round.code}:macro`) - 0.5) * 0.6;

  const factors: Factor[] = [
    { key: "momentum", label: "动量因子", value: Number(momentum.toFixed(2)) },
    { key: "volatility", label: "波动率因子", value: Number(volatility.toFixed(2)) },
    { key: "flow", label: "资金流因子", value: Number(flow.toFixed(2)) },
    { key: "sentiment", label: "情绪因子", value: Number(sentiment.toFixed(2)) },
    { key: "macro", label: "宏观因子", value: Number(macro.toFixed(2)) },
  ];
  const weights: Record<string, number> = { momentum: 0.3, volatility: 0.15, flow: 0.28, sentiment: 0.17, macro: 0.1 };
  const score = factors.reduce((a, f) => a + f.value * (weights[f.key] ?? 0.2), 0);
  const direction: "up" | "down" | "flat" = Math.abs(score) < 0.05 ? "flat" : score > 0 ? "up" : "down";
  const confidence = Math.min(89.9, 50 + Math.abs(score) * 46);

  return {
    roundId: round.id,
    roundCode: round.code,
    direction,
    confidence: Number(confidence.toFixed(1)),
    factors,
    latencyMs: Number((Date.now() - started).toFixed(1)),
    accuracy: SIGNAL_MODEL.accuracy,
    template: buildTemplate(factors, direction),
  };
}

export async function persistSignal(snapshot: SignalSnapshot) {
  const existing = await db.select().from(signals).where(eq(signals.roundId, snapshot.roundId)).limit(1);
  if (existing.length) {
    await db
      .update(signals)
      .set({
        direction: snapshot.direction,
        confidence: snapshot.confidence,
        factors: snapshot.factors,
        latencyMs: snapshot.latencyMs,
        template: snapshot.template,
      })
      .where(eq(signals.roundId, snapshot.roundId));
    return;
  }
  await db.insert(signals).values({
    roundId: snapshot.roundId,
    roundCode: snapshot.roundCode,
    direction: snapshot.direction,
    confidence: snapshot.confidence,
    factors: snapshot.factors,
    latencyMs: snapshot.latencyMs,
    accuracy: snapshot.accuracy,
    template: snapshot.template,
  });
}

export async function signalHistoryForRound(roundId: number) {
  const rows = await db.select().from(signals).where(eq(signals.roundId, roundId)).limit(1);
  return rows[0] ?? null;
}

/** 历史准确率统计（真实回测，同时展示 51.3% 基准） */
export async function signalAccuracy() {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14);
  const rows = await db
    .select({
      direction: signals.direction,
      result: rounds.result,
      code: rounds.code,
      confidence: signals.confidence,
    })
    .from(signals)
    .innerJoin(rounds, eq(rounds.id, signals.roundId))
    .where(gte(rounds.startTime, since));
  const judged = rows.filter((r) => r.direction !== "flat" && (r.result === "up" || r.result === "down"));
  const hits = judged.filter((r) => r.direction === r.result).length;
  return {
    sample: judged.length,
    hits,
    realAccuracy: judged.length ? hits / judged.length : 0,
    displayAccuracy: SIGNAL_MODEL.accuracy,
    windowLabel: "近 14 天演算周期",
  };
}
