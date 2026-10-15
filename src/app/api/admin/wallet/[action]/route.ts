import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { deposits, withdrawals, accounts, ledgerEntries, users, notifications } from "@/db/schema";
import { errorResponse, ok, requireScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 发送通知辅助函数 */
async function sendNotification(
  userId: number,
  title: string,
  content: string,
  type: "info" | "success" | "warning" | "error" = "info"
) {
  await db.insert(notifications).values({
    userId,
    title,
    content,
    type,
  });
}

/** 管理端钱包接口 */
export async function GET(req: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    await requireScope("finance");
    const { action } = await params;

    // 资金总览
    if (action === "overview") {
      const [depositStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          amount: sql<number>`coalesce(sum(amount), 0)::bigint`,
        })
        .from(deposits);

      const [withdrawStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          amount: sql<number>`coalesce(sum(amount), 0)::bigint`,
          fee: sql<number>`coalesce(sum(fee), 0)::bigint`,
        })
        .from(withdrawals);

      const [pendingDeposits] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(deposits)
        .where(eq(deposits.status, "pending"));

      const [pendingWithdrawals] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(withdrawals)
        .where(eq(withdrawals.status, "pending"));

      return ok({
        deposits: {
          totalCount: depositStats?.total ?? 0,
          totalAmount: Number(depositStats?.amount ?? 0),
          pendingCount: pendingDeposits?.count ?? 0,
        },
        withdrawals: {
          totalCount: withdrawStats?.total ?? 0,
          totalAmount: Number(withdrawStats?.amount ?? 0),
          totalFee: Number(withdrawStats?.fee ?? 0),
          pendingCount: pendingWithdrawals?.count ?? 0,
        },
      });
    }

    // 充值列表
    if (action === "deposits") {
      const list = await db
        .select({
          id: deposits.id,
          userId: deposits.userId,
          amount: deposits.amount,
          status: deposits.status,
          paymentMethod: deposits.paymentMethod,
          remark: deposits.remark,
          createdAt: deposits.createdAt,
          nickname: users.nickname,
          username: users.username,
        })
        .from(deposits)
        .leftJoin(users, eq(deposits.userId, users.id))
        .orderBy(desc(deposits.createdAt))
        .limit(100);

      return ok({ list });
    }

    // 提现列表
    if (action === "withdrawals") {
      const list = await db
        .select({
          id: withdrawals.id,
          userId: withdrawals.userId,
          amount: withdrawals.amount,
          fee: withdrawals.fee,
          actualAmount: withdrawals.actualAmount,
          status: withdrawals.status,
          withdrawAccount: withdrawals.withdrawAccount,
          withdrawName: withdrawals.withdrawName,
          remark: withdrawals.remark,
          createdAt: withdrawals.createdAt,
          nickname: users.nickname,
          username: users.username,
        })
        .from(withdrawals)
        .leftJoin(users, eq(withdrawals.userId, users.id))
        .orderBy(desc(withdrawals.createdAt))
        .limit(100);

      return ok({ list });
    }

    return errorResponse(new Error("未知操作"));
  } catch (err) {
    return errorResponse(err);
  }
}

/** 审核操作 */
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    const admin = await requireScope("finance");
    const { action } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      id?: number;
      status?: string;
      remark?: string;
    };

    if (!body.id) {
      return errorResponse(new Error("缺少 ID"));
    }
    const id = body.id;

    // 充值审核通过（事务：更新状态 + 加余额 + 流水）
    if (action === "approve-deposit") {
      const [deposit] = await db.select().from(deposits).where(eq(deposits.id, id));
      if (!deposit) {
        return errorResponse(new Error("充值记录不存在"));
      }
      if (deposit.status !== "pending") {
        return errorResponse(new Error("该充值已处理"));
      }

      await db.transaction(async (tx) => {
        await tx
          .update(deposits)
          .set({ status: "approved", reviewedBy: admin.id, reviewedAt: new Date() })
          .where(eq(deposits.id, id));

        const [account] = await tx.select().from(accounts).where(eq(accounts.userId, deposit.userId)).for("update");
        if (account) {
          const newBalance = account.balance + deposit.amount;
          await tx.update(accounts).set({ balance: newBalance }).where(eq(accounts.userId, deposit.userId));

          await tx.insert(ledgerEntries).values({
            userId: deposit.userId,
            amount: deposit.amount,
            type: "deposit",
            refId: `deposit_${deposit.id}`,
            balanceAfter: newBalance,
            remark: `充值到账 ¥${deposit.amount}`,
          });
        }
      });

      // 发送通知
      await sendNotification(
        deposit.userId,
        "充值到账通知",
        `您的充值 ¥${deposit.amount} 已确认到账，余额已更新。`,
        "success"
      );

      return ok({ message: "充值已通过，积分已到账" });
    }

    // 拒绝充值
    if (action === "reject-deposit") {
      const [deposit] = await db.select().from(deposits).where(eq(deposits.id, id));
      await db
        .update(deposits)
        .set({ status: "rejected", reviewedBy: admin.id, reviewedAt: new Date(), remark: body.remark ?? "审核未通过" })
        .where(eq(deposits.id, id));

      if (deposit) {
        await sendNotification(
          deposit.userId,
          "充值审核未通过",
          `您的充值申请 ¥${deposit.amount} 审核未通过。原因：${body.remark ?? "审核未通过"}`,
          "warning"
        );
      }

      return ok({ message: "充值已拒绝" });
    }

    // 提现审核通过（事务：更新状态 + 流水记录实际余额）
    if (action === "approve-withdraw") {
      const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, id));
      if (!withdrawal) {
        return errorResponse(new Error("提现记录不存在"));
      }
      if (withdrawal.status !== "pending") {
        return errorResponse(new Error("该提现已处理"));
      }

      let balanceAfter = 0;
      await db.transaction(async (tx) => {
        await tx
          .update(withdrawals)
          .set({ status: "paid", reviewedBy: admin.id, reviewedAt: new Date(), paidAt: new Date() })
          .where(eq(withdrawals.id, id));

        // 查询实际余额（冻结后余额 = 当前余额，因为申请时已冻结）
        const [account] = await tx.select().from(accounts).where(eq(accounts.userId, withdrawal.userId));
        balanceAfter = account?.balance ?? 0;

        // 记录流水（balanceAfter 为实际余额，不再写死0）
        await tx.insert(ledgerEntries).values({
          userId: withdrawal.userId,
          amount: -withdrawal.amount,
          type: "withdraw_paid",
          refId: `withdraw_${withdrawal.id}`,
          balanceAfter,
          remark: `提现打款 ¥${withdrawal.actualAmount}（手续费 ¥${withdrawal.fee}）`,
        });
      });

      // 发送通知
      await sendNotification(
        withdrawal.userId,
        "提现打款通知",
        `您的提现申请 ¥${withdrawal.amount} 已处理打款，实际到账 ¥${withdrawal.actualAmount}（手续费 ¥${withdrawal.fee}）。`,
        "success"
      );

      return ok({ message: "提现已放行打款" });
    }

    // 拒绝提现（事务：退回余额 + 流水 + 更新状态）
    if (action === "reject-withdraw") {
      const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, id));
      if (!withdrawal) {
        return errorResponse(new Error("提现记录不存在"));
      }
      if (withdrawal.status !== "pending") {
        return errorResponse(new Error("该提现已处理"));
      }

      await db.transaction(async (tx) => {
        // 退回余额（锁定行防止并发）
        const [account] = await tx.select().from(accounts).where(eq(accounts.userId, withdrawal.userId)).for("update");
        if (account) {
          const newBalance = account.balance + withdrawal.amount;
          await tx.update(accounts).set({ balance: newBalance }).where(eq(accounts.userId, withdrawal.userId));

          await tx.insert(ledgerEntries).values({
            userId: withdrawal.userId,
            amount: withdrawal.amount,
            type: "withdraw_refund",
            refId: `withdraw_${withdrawal.id}`,
            balanceAfter: newBalance,
            remark: `提现驳回，退回 ¥${withdrawal.amount}`,
          });
        }

        await tx
          .update(withdrawals)
          .set({ status: "rejected", reviewedBy: admin.id, reviewedAt: new Date(), remark: body.remark ?? "审核未通过" })
          .where(eq(withdrawals.id, id));
      });

      // 发送通知
      await sendNotification(
        withdrawal.userId,
        "提现审核未通过",
        `您的提现申请 ¥${withdrawal.amount} 审核未通过，余额已退回。原因：${body.remark ?? "审核未通过"}`,
        "warning"
      );

      return ok({ message: "提现已拒绝，余额已退回" });
    }

    return errorResponse(new Error("未知操作"));
  } catch (err) {
    return errorResponse(err);
  }
}
