import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { sql } from "drizzle-orm";

export type PlatformConfig = {
  roundDurationSec: number;
  bettingWindowSec: number;
  lockBufferSec: number;
  rakeRate: number;
  minBet: number;
  maxBetPerRound: number;
  maxDailyStake: number;
  newPlayerGrant: number;
  dailySigninReward: number;
  settlementRule: "A" | "A+B";
  aiArbitration: boolean;
  marketMaking: boolean;
  marketMakingIntensity: number;
  signalAccuracy: number;
  sessionReminderMinutes: number;
  cooldownDefaultMinutes: number;
  dataStreamLevel: number;
  collectorUrl: string;
  collectorPageUrl: string;
};

export const CONFIG_DEFAULTS: PlatformConfig = {
  roundDurationSec: 300,
  bettingWindowSec: 240,
  lockBufferSec: 30,
  rakeRate: 0.05,
  minBet: 100,
  maxBetPerRound: 50000,
  maxDailyStake: 200000,
  newPlayerGrant: 20000,
  dailySigninReward: 800,
  settlementRule: "A+B",
  aiArbitration: true,
  marketMaking: true,
  marketMakingIntensity: 3,
  signalAccuracy: 51.3,
  sessionReminderMinutes: 30,
  cooldownDefaultMinutes: 30,
  dataStreamLevel: 82,
  collectorUrl: "https://77tj.org/api/tencent/car",
  collectorPageUrl: "https://www.77tj.org/car",
};

type Cache = { value: PlatformConfig; at: number };
const globalForConfig = globalThis as typeof globalThis & { __cnxConfig?: Cache };

export async function getConfig(force = false): Promise<PlatformConfig> {
  const cached = globalForConfig.__cnxConfig;
  if (!force && cached && Date.now() - cached.at < 3000) return cached.value;
  let merged: PlatformConfig = { ...CONFIG_DEFAULTS };
  try {
    const rows = await db.select().from(platformConfig);
    for (const row of rows) {
      if (row.key in merged) {
        (merged as unknown as Record<string, unknown>)[row.key] = row.value;
      }
    }
  } catch {
    // 数据库尚未初始化时回退到默认配置
  }
  globalForConfig.__cnxConfig = { value: merged, at: Date.now() };
  return merged;
}

export async function setConfig(patch: Partial<PlatformConfig>): Promise<PlatformConfig> {
  const entries = Object.entries(patch).filter(([k]) => k in CONFIG_DEFAULTS);
  for (const [key, value] of entries) {
    await db
      .insert(platformConfig)
      .values({ key, value: value as unknown })
      .onConflictDoUpdate({
        target: platformConfig.key,
        set: { value: value as unknown, updatedAt: sql`now()` },
      });
  }
  globalForConfig.__cnxConfig = undefined;
  return getConfig(true);
}
