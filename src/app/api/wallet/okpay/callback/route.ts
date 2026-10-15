import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deposits, accounts, ledgerEntries, notifications } from "@/db/schema";
import { verifyCallbackSign, assertOkpayConfig } from "@/lib/okpay-config";

export const dynamic = "force-dynamic";

/**
 * Okpay 支付回调通知
 * - 签名验证
 * - 幂等处理（重复回调返回 success）
 * - 资金操作（更新充值+加余额+记流水+发通知）在事务内原子执行
 */
export async function POST(req: Request) {
  try {
    assertOkpayConfig();

    const body = (await req.json().catch(() => ({}))) as Record<string, string>;

    // 1. 验证签名（安全第一）
    if (!verifyCallbackSign(body)) {
      console.error("Okpay 回调签名验证失败:", body);
      return new Response("fail", { status: 400 });
    }

    const { order_id, amount, trade_status, transaction_id } = body;

    // 2. 只处理支付成功的通知
    if (trade_status !== "SUCCESS" && trade_status !== "success") {
      return new Response("success", { status: 200 });
    }

    // 3. 查找本地充值记录
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.remark, `Okpay 订单号: ${order_id}`))
      .limit(1);

    if (!deposit) {
      console.error("Okpay 回调找不到订单:", order_id);
      return new Response("fail", { status: 404 });
    }

    // 4. 防止重复回调（幂等性）
    if (deposit.status === "approved") {
      return new Response("success", { status: 200 });
    }

    // 5. 资金操作（事务内原子执行）
    await db.transaction(async (tx) => {
      // 锁定充值记录
      const [locked] = await tx
        .select()
        .from(deposits)
        .where(eq(deposits.id, deposit.id))
        .for("update");

      if (!locked || locked.status === "approved") {
        // 并发回调已处理，幂等返回
        return;
      }

      // 更新充值记录为已到账
      await tx
        .update(deposits)
        .set({
          status: "approved",
          remark: `Okpay 订单号: ${order_id} | 交易哈希: ${transaction_id || "N/A"}`,
        })
        .where(eq(deposits.id, deposit.id));

      // 给用户账户加余额（锁定行）
      const [account] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.userId, deposit.userId))
        .for("update");

      if (account) {
        const newBalance = Number(account.balance) + Number(deposit.amount);
        await tx.update(accounts).set({ balance: String(newBalance) }).where(eq(accounts.userId, deposit.userId));

        // 记录流水
        await tx.insert(ledgerEntries).values({
          userId: deposit.userId,
          amount: String(deposit.amount),
          type: "deposit",
          refId: `deposit_${deposit.id}`,
          balanceAfter: String(newBalance),
          remark: `Okpay USDT 充值 ¥${deposit.amount}`,
        });
      }

      // 发送到账通知
      await tx.insert(notifications).values({
        userId: deposit.userId,
        title: "充值到账",
        content: `您的充值 ¥${deposit.amount} 已到账，可用余额已更新。`,
        type: "success",
      });
    });

    console.log(`Okpay 充值到账: 用户=${deposit.userId}, 金额=${deposit.amount}, 订单=${order_id}`);

    return new Response("success", { status: 200 });
  } catch (err) {
    console.error("Okpay 回调处理错误:", err);
    return new Response("fail", { status: 500 });
  }
}
