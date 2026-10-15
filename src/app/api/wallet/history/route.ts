import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deposits, withdrawals } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 充值提现记录 */
export async function GET() {
  try {
    const user = await requireUser();

    const depositList = await db
      .select()
      .from(deposits)
      .where(eq(deposits.userId, user.id))
      .orderBy(desc(deposits.createdAt))
      .limit(50);

    const withdrawList = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, user.id))
      .orderBy(desc(withdrawals.createdAt))
      .limit(50);

    return ok({
      deposits: depositList,
      withdrawals: withdrawList,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
