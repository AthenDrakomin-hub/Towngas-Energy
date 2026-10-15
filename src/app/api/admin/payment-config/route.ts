import { eq } from "drizzle-orm";
import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CONFIG_KEYS = [
  "usdt_trc20_address",
  "usdt_erc20_address",
  "bank_name",
  "bank_account",
  "bank_account_name",
  "swift_code",
  "deposit_notice",
];

/** 获取收款配置 */
export async function GET() {
  try {
    await requireScope("finance");

    const configs = await db.select().from(platformConfig);
    const result: Record<string, string> = {};

    for (const key of CONFIG_KEYS) {
      const found = configs.find((c) => c.key === `payment.${key}`);
      result[key] = (found?.value as string) || "";
    }

    return ok(result);
  } catch (err) {
    return errorResponse(err);
  }
}

/** 更新收款配置 */
export async function POST(req: Request) {
  try {
    await requireScope("finance");
    const body = (await req.json().catch(() => ({}))) as Record<string, string>;

    for (const [key, value] of Object.entries(body)) {
      if (!CONFIG_KEYS.includes(key)) continue;
      const fullKey = `payment.${key}`;

      // upsert
      const existing = await db.select().from(platformConfig).where(eq(platformConfig.key, fullKey));
      if (existing.length > 0) {
        await db
          .update(platformConfig)
          .set({ value: JSON.stringify(value), updatedAt: new Date() })
          .where(eq(platformConfig.key, fullKey));
      } else {
        await db.insert(platformConfig).values({
          key: fullKey,
          value: JSON.stringify(value),
        });
      }
    }

    return ok({ message: "收款配置已更新" });
  } catch (err) {
    return errorResponse(err);
  }
}
