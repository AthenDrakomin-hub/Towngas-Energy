import { describe, it, expect } from "vitest";
import {
  analyzeCar,
  seededUnit,
  decideResult,
  buildPayoutPlan,
  estimateRatio,
} from "../settlement";
import type { PlatformConfig } from "../config";

// 测试用配置（仅填测试所需字段）
const testCfg = {
  settlementRule: "A+B",
  aiArbitration: true,
  rakeRate: 0.05,
  periods: [],
} as unknown as PlatformConfig;

describe("analyzeCar — 规则A 双重奇偶判定", () => {
  it("末位奇 + 和值奇 → up（看多）", () => {
    // car = [1, 3, 5] → composite = 5 (奇), digitSum = 9, sumParity = 9%10=9 (奇)
    const result = analyzeCar([1, 3, 5]);
    expect(result.composite).toBe(5);
    expect(result.compositeParity).toBe("odd");
    expect(result.digitSum).toBe(9);
    expect(result.sumParity).toBe("odd");
    expect(result.ruleA).toBe("up");
  });

  it("末位偶 + 和值偶 → down（看空）", () => {
    // car = [2, 4, 6] → composite = 6 (偶), digitSum = 12, sumParity = 12%10=2 (偶)
    const result = analyzeCar([2, 4, 6]);
    expect(result.composite).toBe(6);
    expect(result.compositeParity).toBe("even");
    expect(result.digitSum).toBe(12);
    expect(result.sumParity).toBe("even");
    expect(result.ruleA).toBe("down");
  });

  it("末位奇 + 和值偶 → draw（平局）", () => {
    // car = [1, 2, 4] → composite = 4 (偶)... 不对，让我重新算
    // 需要 composite 奇，sumParity 偶的情况
    // car = [1, 2, 3] → composite = 3 (奇), digitSum = 6, sumParity = 6%10=6 (偶)
    const result = analyzeCar([1, 2, 3]);
    expect(result.compositeParity).toBe("odd");
    expect(result.sumParity).toBe("even");
    expect(result.ruleA).toBe("draw");
  });

  it("空数组 → 全 0，偶偶 → down", () => {
    const result = analyzeCar([]);
    expect(result.composite).toBe(0);
    expect(result.digitSum).toBe(0);
    expect(result.ruleA).toBe("down");
  });

  it("单个元素数组 → composite 就是该元素", () => {
    const result = analyzeCar([7]);
    expect(result.composite).toBe(7);
    expect(result.digitSum).toBe(7);
    expect(result.compositeParity).toBe("odd");
    expect(result.sumParity).toBe("odd");
    expect(result.ruleA).toBe("up");
  });
});

describe("seededUnit — 确定性伪随机", () => {
  it("相同输入 → 相同输出（可复现）", () => {
    const a = seededUnit("20261015-001:12345");
    const b = seededUnit("20261015-001:12345");
    expect(a).toBe(b);
  });

  it("不同输入 → 不同输出", () => {
    const a = seededUnit("round-001:123");
    const b = seededUnit("round-002:123");
    expect(a).not.toBe(b);
  });

  it("输出范围在 [0, 1) 之间", () => {
    for (let i = 0; i < 100; i++) {
      const v = seededUnit(`test-seed-${i}`);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("decideResult — 结算结果决策", () => {
  it("管理端 override 优先级最高", () => {
    const result = decideResult({
      car: [1, 3, 5],
      roundCode: "TEST-001",
      cfg: testCfg,
      override: "down",
    });
    expect(result.result).toBe("down");
    expect(result.source).toBe("admin_override");
  });

  it("无数据（car=null）→ collector_gap 退还", () => {
    const result = decideResult({
      car: null,
      roundCode: "TEST-002",
      cfg: testCfg,
    });
    expect(result.result).toBe("draw");
    expect(result.source).toBe("collector_gap");
    expect(result.note).toContain("原路退还");
  });

  it("规则A 直接判定（非平局）→ source = rule_a", () => {
    const result = decideResult({
      car: [1, 3, 5], // 奇奇 → up
      roundCode: "TEST-003",
      cfg: testCfg,
    });
    expect(result.result).toBe("up");
    expect(result.source).toBe("rule_a");
  });

  it("规则A 平局 + AI 仲裁 + 触发 55% → source = rule_b, arbitration = ai", () => {
    // 需要构造一个平局的 car，且 seededUnit < 0.55
    // 平局条件：compositeParity !== sumParity
    // 试几个 seed 找到 roll < 0.55 的
    let found = false;
    for (let i = 0; i < 100 && !found; i++) {
      const car = [i % 10, (i + 1) % 10, (i + 3) % 10]; // 构造不同组合
      const analysis = analyzeCar(car);
      if (analysis.ruleA !== "draw") continue;
      const roll = seededUnit(`TEST-${i}:${car.join("")}`);
      if (roll < 0.55) {
        const result = decideResult({
          car,
          roundCode: `TEST-${i}`,
          aiDirection: "up",
          cfg: testCfg,
        });
        expect(result.source).toBe("rule_b");
        expect(result.arbitration).toBe("ai");
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("规则A 平局 + AI 仲裁 + 未触发 → source = rule_b, arbitration = hold", () => {
    let found = false;
    for (let i = 0; i < 100 && !found; i++) {
      const car = [i % 10, (i + 1) % 10, (i + 3) % 10];
      const analysis = analyzeCar(car);
      if (analysis.ruleA !== "draw") continue;
      const roll = seededUnit(`TEST-${i}:${car.join("")}`);
      if (roll >= 0.55) {
        const result = decideResult({
          car,
          roundCode: `TEST-${i}`,
          aiDirection: "up",
          cfg: testCfg,
        });
        expect(result.source).toBe("rule_b");
        expect(result.arbitration).toBe("hold");
        expect(result.result).toBe("draw");
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("规则A 平局 + 无 AI 方向 → 返回 draw, source = rule_a", () => {
    // 找一个平局的 car
    let drawCar: number[] | null = null;
    for (let i = 0; i < 50; i++) {
      const car = [i % 10, (i + 1) % 10, (i + 3) % 10];
      if (analyzeCar(car).ruleA === "draw") {
        drawCar = car;
        break;
      }
    }
    expect(drawCar).not.toBeNull();

    const result = decideResult({
      car: drawCar!,
      roundCode: "TEST-NO-AI",
      aiDirection: undefined,
      cfg: testCfg,
    });
    expect(result.result).toBe("draw");
    expect(result.source).toBe("rule_a");
  });
});

describe("buildPayoutPlan — 赔付计划", () => {
  const bets = [
    { id: 1, userId: 101, side: "up", amount: 100, isFake: false },
    { id: 2, userId: 102, side: "up", amount: 200, isFake: false },
    { id: 3, userId: 103, side: "down", amount: 300, isFake: false },
    { id: 4, userId: 104, side: "up", amount: 50, isFake: true }, // 假单被吸收
  ];

  it("draw 结果 → 全部退款", () => {
    const plan = buildPayoutPlan({
      result: "draw",
      rakeRate: 0.05,
      bets,
    });
    expect(plan.refunds).toHaveLength(4);
    expect(plan.rakeAmount).toBe(0);
    expect(plan.updates).toHaveLength(0);
  });

  it("up 结果 → 看多池赔付，看空池损失，假单被吸收", () => {
    const plan = buildPayoutPlan({
      result: "up",
      rakeRate: 0.05,
      bets,
    });
    expect(plan.totalPool).toBe(650);
    expect(plan.rakeAmount).toBe(Math.floor(650 * 0.05));
    expect(plan.winPool).toBe(300); // 真单看多：100 + 200
    expect(plan.absorbed).toHaveLength(1); // 1 笔假单
    expect(plan.updates).toHaveLength(3); // 3 笔真单

    // 看多的应该赢，看空的应该输
    const upBets = plan.updates.filter((u) => u.betId <= 2);
    expect(upBets[0].status).toBe("won");
    expect(upBets[1].status).toBe("won");
    expect(plan.updates.find((u) => u.betId === 3)!.status).toBe("lost");
  });

  it("无盈利方（winPool=0）→ 全部抽水", () => {
    const downOnlyBets = [
      { id: 1, userId: 101, side: "down", amount: 100, isFake: false },
      { id: 2, userId: 102, side: "down", amount: 200, isFake: false },
    ];
    const plan = buildPayoutPlan({
      result: "up", // 结果是 up，但没人买 up
      rakeRate: 0.05,
      bets: downOnlyBets,
    });
    expect(plan.winPool).toBe(0);
    expect(plan.rakeAmount).toBe(300); // 全部被抽水
    expect(plan.distributable).toBe(0);
  });
});

describe("estimateRatio — 预估结算率", () => {
  it("side=0 → 返回 0", () => {
    expect(estimateRatio(1000, 0, 0.05)).toBe(0);
  });

  it("正常计算 → 池×(1-费率)/多方", () => {
    // 1000 池，5% 抽水，300 多方
    // = 1000 * 0.95 / 300 = 3.166...
    const ratio = estimateRatio(1000, 300, 0.05);
    expect(ratio).toBeCloseTo(3.1667, 1);
  });
});
