import type { PlatformConfig } from "./config";

export type CarSnapshot = {
  onlinetime: Date;
  car: number[];
  onlineCount: number | null;
  hashValue: string | null;
};

export type SettlementResult = "up" | "down" | "draw" | "void";

export type RuleAnalysis = {
  composite: number;
  compositeParity: "odd" | "even";
  digitSum: number;
  sumParity: "odd" | "even";
  ruleA: SettlementResult;
};

const parity = (n: number): "odd" | "even" => (Math.abs(n) % 2 === 1 ? "odd" : "even");

/** 规则A：末位奇偶 + 和值奇偶双重判定 */
export function analyzeCar(car: number[]): RuleAnalysis {
  const composite = Number(car[car.length - 1] ?? 0);
  const digitSum = car.reduce((a, b) => a + Number(b ?? 0), 0);
  const compositeParity = parity(composite);
  const sumParity = parity(digitSum % 10);
  const ruleA: SettlementResult =
    compositeParity === sumParity ? (compositeParity === "odd" ? "up" : "down") : "draw";
  return { composite, compositeParity, digitSum, sumParity, ruleA };
}

/** 确定性伪随机（可复现，用于规则B的55%仲裁） */
export function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export type RuleDecision = {
  result: SettlementResult;
  source: "rule_a" | "rule_b" | "admin_override" | "collector_gap" | "cancelled";
  analysis: RuleAnalysis | null;
  arbitration?: "ai" | "hold";
  note: string;
};

export function decideResult(input: {
  car: number[] | null;
  roundCode: string;
  aiDirection?: "up" | "down" | "flat";
  cfg: PlatformConfig;
  override?: "up" | "down" | "draw" | null;
}): RuleDecision {
  if (input.override) {
    return {
      result: input.override,
      source: "admin_override",
      analysis: input.car ? analyzeCar(input.car) : null,
      note: "管理端结果控制台指定结果已生效",
    };
  }
  if (!input.car) {
    return {
      result: "draw",
      source: "collector_gap",
      analysis: null,
      note: "生态数据源·ES-77 本窗口无采集记录，投资份额原路退还",
    };
  }
  const analysis = analyzeCar(input.car);
  if (analysis.ruleA !== "draw") {
    return {
      result: analysis.ruleA,
      source: "rule_a",
      analysis,
      note: `综合指数末位=${analysis.composite}(${analysis.compositeParity === "odd" ? "奇" : "偶"}) 和值=${analysis.digitSum}(${analysis.sumParity === "odd" ? "奇" : "偶"})`,
    };
  }
  const aiDir = input.aiDirection === "up" || input.aiDirection === "down" ? input.aiDirection : null;
  if (input.cfg.settlementRule === "A+B" && input.cfg.aiArbitration && aiDir) {
    const roll = seededUnit(`${input.roundCode}:${input.car.join("")}`);
    if (roll < 0.55) {
      return {
        result: aiDir,
        source: "rule_b",
        analysis,
        arbitration: "ai",
        note: `双重奇偶判定出现平局，五因子综合评分仲裁生效（置信度 ${(roll * 100).toFixed(1)}%）`,
      };
    }
    return {
      result: "draw",
      source: "rule_b",
      analysis,
      arbitration: "hold",
      note: `双重奇偶判定平局，五因子仲裁未触发（置信度 ${(roll * 100).toFixed(1)}%）`,
    };
  }
  return {
    result: "draw",
    source: "rule_a",
    analysis,
    note: `综合指数末位=${analysis.composite}(${analysis.compositeParity === "odd" ? "奇" : "偶"}) 和值=${analysis.digitSum}(${analysis.sumParity === "odd" ? "奇" : "偶"}) → 平局`,
  };
}

export type PayoutPlan = {
  result: SettlementResult;
  rakeAmount: number;
  totalPool: number;
  distributable: number;
  winPool: number;
  ratio: number;
  updates: { betId: number; userId: number; amount: number; payout: number; status: string }[];
  refunds: { betId: number; userId: number; amount: number }[];
  absorbed: { betId: number; userId: number; amount: number }[];
};

/** 结算率与赔付计算：可用流动性池 ÷ 盈利方向总投资份额 */
export function buildPayoutPlan(input: {
  result: SettlementResult;
  rakeRate: number;
  bets: { id: number; userId: number; side: string; amount: number; isFake: boolean }[];
}): PayoutPlan {
  const totalPool = input.bets.reduce((a, b) => a + b.amount, 0);
  const base: PayoutPlan = {
    result: input.result,
    rakeAmount: 0,
    totalPool,
    distributable: 0,
    winPool: 0,
    ratio: 0,
    updates: [],
    refunds: [],
    absorbed: [],
  };
  if (input.result === "draw" || input.result === "void") {
    base.refunds = input.bets.map((b) => ({ betId: b.id, userId: b.userId, amount: b.amount }));
    return base;
  }
  const rakeAmount = Math.floor(totalPool * input.rakeRate);
  const distributable = totalPool - rakeAmount;
  const live = input.bets.filter((b) => !b.isFake);
  const absorbedBets = input.bets.filter((b) => b.isFake);
  base.absorbed = absorbedBets.map((b) => ({ betId: b.id, userId: b.userId, amount: b.amount }));
  const winPool = live.filter((b) => b.side === input.result).reduce((a, b) => a + b.amount, 0);
  base.rakeAmount = rakeAmount;
  base.distributable = distributable;
  base.winPool = winPool;
  base.ratio = winPool > 0 ? distributable / winPool : 0;
  base.updates = live.map((b) => {
    const won = b.side === input.result;
    return {
      betId: b.id,
      userId: b.userId,
      amount: b.amount,
      payout: won && winPool > 0 ? Math.round(b.amount * base.ratio) : 0,
      status: won ? (winPool > 0 ? "won" : "lost") : "lost",
    };
  });
  if (winPool === 0 && totalPool > 0) {
    base.rakeAmount = totalPool;
    base.distributable = 0;
  }
  return base;
}

/** 预估结算率（大厅展示用） */
export function estimateRatio(pool: number, side: number, rakeRate: number): number {
  if (side <= 0) return 0;
  return (pool * (1 - rakeRate)) / side;
}
