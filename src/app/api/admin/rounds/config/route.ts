import { errorResponse, ok, requireScope } from "@/lib/auth";
import { writeAdminLog } from "@/lib/admin";
import { getConfig, setConfig, type PlatformConfig } from "@/lib/config";
import { logTerminal } from "@/lib/logs";

export const dynamic = "force-dynamic";

const ROUND_KEYS: (keyof PlatformConfig)[] = [
  "roundDurationSec",
  "bettingWindowSec",
  "lockBufferSec",
  "rakeRate",
  "minBet",
  "maxBetPerRound",
  "maxDailyStake",
  "marketMaking",
  "marketMakingIntensity",
  "settlementRule",
  "aiArbitration",
  "newPlayerGrant",
  "dailySigninReward",
  "sessionReminderMinutes",
];

export async function GET() {
  try {
    await requireScope("rounds");
    return ok(await getConfig(true));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireScope("rounds");
    const body = (await req.json().catch(() => ({}))) as Partial<PlatformConfig>;
    const patch: Partial<PlatformConfig> = {};
    for (const key of ROUND_KEYS) {
      if (key in body) (patch as Record<string, unknown>)[key] = body[key];
    }
    const next = await setConfig(patch);
    await writeAdminLog(admin, "round-config", "config", "rounds", patch as Record<string, unknown>);
    await logTerminal("warn", "控制台", `周期参数已更新 | ${JSON.stringify(patch)}`);
    return ok(next);
  } catch (err) {
    return errorResponse(err);
  }
}
