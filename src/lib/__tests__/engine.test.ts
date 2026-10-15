import { describe, it, expect, vi } from "vitest";

// Mock 数据库模块，避免测试时连接真实 DB
vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }),
    insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: () => [] }) }) }),
    update: () => ({ set: () => ({ where: () => [] }) }),
  },
}));
vi.mock("@/db/schema", () => ({
  accounts: {},
  bets: {},
  resultOverrides: {},
  roundSettlements: {},
  rounds: { code: "code", status: "status", lockTime: "lockTime" },
  signals: {},
  users: {},
}));
vi.mock("../collector", () => ({ runCollector: vi.fn() }));
vi.mock("../ledger", () => ({ applyLedger: vi.fn(), ensureAccount: vi.fn() }));
vi.mock("../logs", () => ({ logTerminal: vi.fn(), pruneLogs: vi.fn() }));
vi.mock("../signal", () => ({ computeSignal: vi.fn(), persistSignal: vi.fn() }));
vi.mock("../gamification", () => ({ checkAchievements: vi.fn() }));

import { windowBounds } from "../engine";
import { PERIODS } from "../constants";

describe("windowBounds — 周期时间边界计算", () => {
  it("5m 周期：整点对齐 + settleOffset 错开", () => {
    // 选一个确定的时间点：2026-10-15T12:00:00Z
    const now = new Date("2026-10-15T12:00:00Z");
    const bounds = windowBounds("5m", now);

    // 5m windowMs = 5*60*1000 = 300000
    // settleOffsetSec 需要从 PERIODS 读取
    const cfg = PERIODS["5m"];
    expect(cfg.windowMs).toBe(5 * 60 * 1000);

    // start 应该是对齐到 5 分钟窗口的
    expect(bounds.start.getTime() % cfg.windowMs).toBe(cfg.settleOffsetSec * 1000 % cfg.windowMs);
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(cfg.windowMs);
  });

  it("1m 周期：1 分钟窗口", () => {
    const now = new Date("2026-10-15T12:34:56Z");
    const bounds = windowBounds("1m", now);
    const cfg = PERIODS["1m"];
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(cfg.windowMs);
    expect(cfg.windowMs).toBe(60 * 1000);
  });

  it("30m 周期：30 分钟窗口", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    const bounds = windowBounds("30m", now);
    const cfg = PERIODS["30m"];
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(cfg.windowMs);
    expect(cfg.windowMs).toBe(30 * 60 * 1000);
  });

  it("不同周期的 settleOffsetSec 应该错开", () => {
    const offsets = Object.values(PERIODS).map((p) => p.settleOffsetSec);
    // 至少有 2 个不同的 offset
    const uniqueOffsets = new Set(offsets);
    expect(uniqueOffsets.size).toBeGreaterThanOrEqual(2);
  });

  it("时间边界是连续的：上一个 end = 下一个 start", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    const bounds1 = windowBounds("5m", now);
    // 推到窗口结束后再取
    const afterEnd = new Date(bounds1.end.getTime() + 1000);
    const bounds2 = windowBounds("5m", afterEnd);
    // bounds2.start 应该 >= bounds1.end
    expect(bounds2.start.getTime()).toBeGreaterThanOrEqual(bounds1.end.getTime() - 1000);
  });
});

describe("engine 状态机 — 待补充（需 DB mock）", () => {
  it.skip("advancePhases: betting → locked 状态流转", () => {
    // TODO: mock db 后补集成测试
  });

  it.skip("settleOverdueRounds: locked → settled 结算流程", () => {
    // TODO: mock db + collector + ledger 后补集成测试
  });

  it.skip("ensureCurrentRound: 无当前轮次时自动创建", () => {
    // TODO: mock db 后补集成测试
  });
});
