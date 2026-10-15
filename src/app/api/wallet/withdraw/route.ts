import { eq, sql, and, gte, lte } from "drizzle-orm";
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
  // AML 规则
  largeWithdrawThreshold: 10000, // 单笔大额提现阈值
  dailyLargeWithdrawAlert: 20000, // 单日大额告警阈值
  frequentWithdrawPerHour: 3, // 每小时提现次数限制
  newUserWithdrawDiscount: 0.5, // 新用户提现限额折扣
  newUserDays: 7, // 新用户定义天数
};

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

/** 提现申请 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
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

    // 新用户限额折扣
    const [userInfo] = await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, user.id));

    let maxSingle = RISK_RULES.maxSingleWithdraw;
    if (userInfo?.createdAt) {
      const daysSinceRegister = (Date.now() - new Date(userInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRegister < RISK_RULES.newUserDays) {
        maxSingle = Math.floor(maxSingle * RISK_RULES.newUserWithdrawDiscount);
      }
    }

    if (body.amount > maxSingle) {
      return errorResponse(new Error(`单笔提现不能超过 ¥${maxSingle}（新用户限额）`));
    }

    if (!body.withdrawAccount?.trim()) {
      return errorResponse(new Error("请填写提现账户"));
    }
    if (!body.withdrawName?.trim()) {
      return errorResponse(new Error("请填写收款人姓名"));
    }

    // ===== 风控校验 1：新用户冷静期 =====
    if (userInfo?.createdAt) {
      const hoursSinceRegister = (Date.now() - new Date(userInfo.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceRegister < RISK_RULES.newUserCooldownHours) {
        const remaining = Math.ceil(RISK_RULES.newUserCooldownHours - hoursSinceRegister);
        return errorResponse(new Error(`新用户注册 ${RISK_RULES.newUserCooldownHours} 小时内不能提现，还需等待 ${remaining} 小时`));
      }
    }

    // ===== 检查余额 =====
    const [account] = await db.select().from(accounts).where(eq(accounts.userId, user.id));
    if (!account) {
      return errorResponse(new Error("账户不存在"));
    }
    if (account.balance < body.amount) {
      return errorResponse(new Error("余额不足"));
    }

    // ===== 风控校验 2：每日提现限额 =====
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [dailyStats] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)::bigint` })
      .from(withdrawals)
      .where(
        and(
          eq(withdrawals.userId, user.id),
          gte(withdrawals.createdAt, today),
          sql`status != 'rejected'`,
        ),
      );

    const todayWithdrawn = Number(dailyStats?.total ?? 0);
    if (todayWithdrawn + body.amount > RISK_RULES.dailyWithdrawLimit) {
      const remaining = RISK_RULES.dailyWithdrawLimit - todayWithdrawn;
      return errorResponse(new Error(`今日已提现 ¥${todayWithdrawn}，每日上限 ¥${RISK_RULES.dailyWithdrawLimit}，今日还可提现 ¥${remaining}`));
    }

    // ===== 风控校验 3：频繁提现检测 =====
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [hourlyStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(withdrawals)
      .where(
        and(
          eq(withdrawals.userId, user.id),
          gte(withdrawals.createdAt, oneHourAgo),
          sql`status != 'rejected'`,
        ),
      );

    if ((hourlyStats?.count ?? 0) >= RISK_RULES.frequentWithdrawPerHour) {
      return errorResponse(new Error(`1 小时内提现申请已达 ${RISK_RULES.frequentWithdrawPerHour} 次，请稍后再试`));
    }

    // ===== 计算手续费 5% =====
    const amount = Math.floor(body.amount);
    const fee = Math.floor(amount * 0.05);
    const actualAmount = amount - fee;
    const withdrawAccount = body.withdrawAccount?.trim() ?? "";
    const withdrawName = body.withdrawName?.trim() ?? "";
    const remark = body.remark?.slice(0, 200) ?? "";

    // ===== 大额交易标记 =====
    const isLargeAmount = amount >= RISK_RULES.largeWithdrawThreshold;

    // ===== 冻结余额（事务：扣余额 + 创建提现记录 + 流水，原子操作） =====
    const newBalance = account.balance - amount;

    const [withdrawal] = await db.transaction(async (tx) => {
      // 锁定账户行，防止并发提现
      const [lockedAccount] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.userId, user.id))
        .for("update");

      if (!lockedAccount || lockedAccount.balance < amount) {
        throw new Error("余额不足");
      }

      await tx.update(accounts).set({ balance: newBalance }).where(eq(accounts.userId, user.id));

      const [wd] = await tx
        .insert(withdrawals)
        .values({
          userId: user.id,
          amount,
          fee,
          actualAmount,
          withdrawAccount,
          withdrawName,
          remark: remark + (isLargeAmount ? " [大额交易]" : ""),
          status: "pending",
        })
        .returning();

      await tx.insert(ledgerEntries).values({
        userId: user.id,
        amount: -amount,
        type: "withdraw_freeze",
        refId: `withdraw_${wd.id}`,
        balanceAfter: newBalance,
        remark: `提现申请冻结 ¥${amount}（手续费 ¥${fee}）${isLargeAmount ? " [大额交易]" : ""}`,
      });

      return [wd];
    });

    // ===== 大额交易告警通知管理员 =====
    if (isLargeAmount) {
      await sendNotification(
        1, // 管理员 ID
        "⚠️ 大额提现告警",
        `用户 ${user.username} 申请提现 ¥${amount}，请及时审核。`,
        "warning"
      );
    }

    return ok({
      id: withdrawal.id,
      amount: withdrawal.amount,
      fee: withdrawal.fee,
      actualAmount: withdrawal.actualAmount,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      message: isLargeAmount
        ? "大额提现申请已提交，将进行二次审核"
        : "提现申请已提交，预计 1-24 小时内到账",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
