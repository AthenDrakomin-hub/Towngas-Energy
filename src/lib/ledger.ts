import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, ledgerEntries } from "@/db/schema";

export type LedgerType =
  | "bet"
  | "payout"
  | "refund"
  | "rake"
  | "adjust"
  | "signin"
  | "task"
  | "grant"
  | "absorb";

export const LEDGER_LABEL: Record<LedgerType, string> = {
  bet: "建立投资份额",
  payout: "清算收益",
  refund: "平局退还",
  rake: "服务费",
  adjust: "管理端调整",
  signin: "每日签到",
  task: "生态任务",
  grant: "积分发放",
  absorb: "流动性回收",
};

export async function ensureAccount(userId: number) {
  await db.insert(accounts).values({ userId }).onConflictDoNothing();
}

/** 原子化积分流转：更新余额 + 写入流水 */
export async function applyLedger(input: {
  userId: number;
  amount: number;
  type: LedgerType;
  refId?: string;
  remark?: string;
}): Promise<number> {
  await ensureAccount(input.userId);
  const updated = await db
    .update(accounts)
    .set({
      balance: sql`${accounts.balance} + ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(accounts.userId, input.userId))
    .returning({ balance: accounts.balance });
  const balanceAfter = updated[0]?.balance ?? 0;
  await db.insert(ledgerEntries).values({
    userId: input.userId,
    amount: input.amount,
    type: input.type,
    refId: input.refId ?? null,
    balanceAfter,
    remark: input.remark ?? LEDGER_LABEL[input.type],
  });
  return balanceAfter;
}

export async function getBalance(userId: number): Promise<number> {
  const rows = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
  return rows[0]?.balance ?? 0;
}
