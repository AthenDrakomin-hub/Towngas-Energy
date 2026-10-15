import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { deposits, withdrawals } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 获取当前用户的充值/提现记录 */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);

    const depositList = await db
      .select()
      .from(deposits)
      .where(eq(deposits.userId, user.id))
      .orderBy(desc(deposits.createdAt))
      .limit(50);

    const withdrawalList = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, user.id))
      .orderBy(desc(withdrawals.createdAt))
      .limit(50);

    return ok({
      deposits: depositList,
      withdrawals: withdrawalList,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
