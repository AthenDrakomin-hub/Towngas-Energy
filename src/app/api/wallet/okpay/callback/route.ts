import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deposits, accounts, ledgerEntries, notifications } from "@/db/schema";
import { verifyCallbackSign } from "@/lib/okpay-config";

export const dynamic = "force-dynamic";

/**
 * Okpay 支付回调通知
 * 用户转账成功后，Okpay 会调用这个接口通知我们
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

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
      .where(eq(deposits.remark, `Okpay 订单号: ${order_id}`));

    if (!deposit) {
      console.error("Okpay 回调找不到订单:", order_id);
      return new Response("fail", { status: 404 });
    }

    // 4. 防止重复回调（幂等性）
    if (deposit.status === "approved") {
      return new Response("success", { status: 200 });
    }

    // 5. 更新充值记录为已到账
    await db
      .update(deposits)
      .set({
        status: "approved",
        remark: `Okpay 订单号: ${order_id} | 交易哈希: ${transaction_id || "N/A"}`,
      })
      .where(eq(deposits.id, deposit.id));

    // 6. 给用户账户加余额
    const [account] = await db.select().from(accounts).where(eq(accounts.userId, deposit.userId));
    if (account) {
      const newBalance = account.balance + Number(deposit.amount);
      await db.update(accounts).set({ balance: newBalance }).where(eq(accounts.userId, deposit.userId));

      // 7. 记录流水
      await db.insert(ledgerEntries).values({
        userId: deposit.userId,
        amount: Number(deposit.amount),
        type: "deposit",
        refId: `deposit_${deposit.id}`,
        balanceAfter: newBalance,
        remark: `Okpay USDT 充值 ¥${deposit.amount}`,
      });

      // 8. 发送到账通知
      await db.insert(notifications).values({
        userId: deposit.userId,
        title: "充值到账",
        content: `您的充值 ¥${deposit.amount} 已到账，可用余额 ¥${newBalance}`,
        type: "success",
      });
    }

    console.log(`Okpay 充值到账: 用户=${deposit.userId}, 金额=${deposit.amount}, 订单=${order_id}`);

    // 9. 返回 success 告诉 Okpay 我们收到了
    return new Response("success", { status: 200 });
  } catch (err) {
    console.error("Okpay 回调处理错误:", err);
    return new Response("fail", { status: 500 });
  }
}
