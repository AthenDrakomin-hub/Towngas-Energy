import { eq, sql, and, gte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, withdrawals, ledgerEntries, users, notifications } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 风控配置 */
const RISK_RULES = {
  newUserCooldownHours: 24,
  dailyWithdrawLimit: 5000,
  maxSingleWithdraw: 5000,
  minWithdraw: 50,
  largeWithdrawThreshold: 10000,
  frequentWithdrawPerHour: 3,
  newUserWithdrawDiscount: 0.5,
  newUserDays: 7,
};

async function sendNotification(
  userId: number,
  title: string,
  content: string,
  type: "info" | "success" | "warning" | "error" = "info"
) {
  await db.insert(notifications).values({ userId, title, content, type });
}

/**
 * 提现申请
 * 风控校验在事务外（只读），资金操作（冻结余额+创建记录+记流水）在事务内原子执行
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as {
      amount?: number;
      withdrawAccount?: string;
      withdrawName?: string;
      remark?: string;
    };

    // ===== 参数校验 =====
    if (!body.amount || body.amount < RISK_RULES.minWithdraw) {
      return errorResponse(new Error(`最低提现金额为 ${RISK_RULES.minWithdraw} 元`));
    }
    if (!body.withdrawAccount?.trim()) {
      return errorResponse(new Error("请填写提现账户"));
    }
    if (!body.withdrawName?.trim()) {
      return errorResponse(new Error("请填写收款人姓名"));
    }

    // ===== 风控校验（只读，事务外） =====
    const [userInfo] = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, user.id));

    // 新用户限额折扣
    let maxSingle = RISK_RULES.maxSingleWithdraw;
    if (userInfo?.createdAt) {
      const daysSinceRegister =
        (Date.now() - new Date(userInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRegister < RISK_RULES.newUserDays) {
        maxSingle = Math.floor(maxSingle * RISK_RULES.newUserWithdrawDiscount);
      }
    }
    if (body.amount > maxSingle) {
      return errorResponse(new Error(`单笔提现不能超过 ¥${maxSingle}（新用户限额）`));
    }

    // 新用户冷静期
    if (userInfo?.createdAt) {
      const hoursSinceRegister =
        (Date.now() - new Date(userInfo.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceRegister < RISK_RULES.newUserCooldownHours) {
        const remaining = Math.ceil(RISK_RULES.newUserCooldownHours - hoursSinceRegister);
        return errorResponse(
          new Error(`新用户注册 ${RISK_RULES.newUserCooldownHours} 小时内不能提现，还需等待 ${remaining} 小时`)
        );
      }
    }

    // 每日提现限额
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [dailyStats] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)::bigint` })
      .from(withdrawals)
      .where(
        and(
          eq(withdrawals.userId, user.id),
          gte(withdrawals.createdAt, today),
          sql`status != 'rejected'`
        )
      );
    const todayWithdrawn = Number(dailyStats?.total ?? 0);
    if (todayWithdrawn + body.amount > RISK_RULES.dailyWithdrawLimit) {
      const remaining = RISK_RULES.dailyWithdrawLimit - todayWithdrawn;
      return errorResponse(
        new Error(`今日已提现 ¥${todayWithdrawn}，每日上限 ¥${RISK_RULES.dailyWithdrawLimit}，今日还可提现 ¥${remaining}`)
      );
    }

    // 频繁提现检测
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [hourlyStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(withdrawals)
      .where(
        and(
          eq(withdrawals.userId, user.id),
          gte(withdrawals.createdAt, oneHourAgo),
          sql`status != 'rejected'`
        )
      );
    if ((hourlyStats?.count ?? 0) >= RISK_RULES.frequentWithdrawPerHour) {
      return errorResponse(
        new Error(`1 小时内提现申请已达 ${RISK_RULES.frequentWithdrawPerHour} 次，请稍后再试`)
      );
    }

    // ===== 资金操作（事务内原子执行） =====
    const amount = Math.floor(body.amount);
    const fee = Math.floor(amount * 0.05);
    const actualAmount = amount - fee;
    const isLargeAmount = amount >= RISK_RULES.largeWithdrawThreshold;

    const result = await db.transaction(async (tx) => {
      // 锁定账户行（SELECT FOR UPDATE 语义，防止并发超提）
      const [account] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.userId, user.id))
        .for("update");

      if (!account) {
        throw new Error("账户不存在");
      }
      if (Number(account.balance) < amount) {
        throw new Error("余额不足");
      }

      // 冻结余额
      const newBalance = Number(account.balance) - amount;
      await tx.update(accounts).set({ balance: String(newBalance) }).where(eq(accounts.userId, user.id));

      // 创建提现记录
      const [withdrawal] = await tx
        .insert(withdrawals)
        .values({
          userId: user.id,
          amount: String(amount),
          fee: String(fee),
          actualAmount: String(actualAmount),
          withdrawAccount: body.withdrawAccount!.trim(),
          withdrawName: body.withdrawName!.trim(),
          remark: body.remark?.slice(0, 200) + (isLargeAmount ? " [大额交易]" : ""),
          status: "pending",
        })
        .returning();

      // 记录流水
      await tx.insert(ledgerEntries).values({
        userId: user.id,
        amount: String(-amount),
        type: "withdraw_freeze",
        refId: `withdraw_${withdrawal.id}`,
        balanceAfter: String(newBalance),
        remark: `提现申请冻结 ¥${amount}（手续费 ¥${fee}）${isLargeAmount ? " [大额交易]" : ""}`,
      });

      return { withdrawal, newBalance };
    });

    // 大额交易告警（事务外，不影响主流程）
    if (isLargeAmount) {
      await sendNotification(
        1,
        "⚠️ 大额提现告警",
        `用户 ${user.username} 申请提现 ¥${amount}，请及时审核。`,
        "warning"
      );
    }

    return ok({
      id: result.withdrawal.id,
      amount: result.withdrawal.amount,
      fee: result.withdrawal.fee,
      actualAmount: result.withdrawal.actualAmount,
      status: result.withdrawal.status,
      createdAt: result.withdrawal.createdAt,
      message: isLargeAmount
        ? "大额提现申请已提交，将进行二次审核"
        : "提现申请已提交，预计 1-24 小时内到账",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
