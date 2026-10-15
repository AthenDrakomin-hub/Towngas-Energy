import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deposits } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 手动充值申请（用户上传凭证号，管理员人工审核）
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = (await req.json().catch(() => ({}))) as {
      amount?: number;
      paymentProof?: string;
      remark?: string;
    };

    if (!body.amount || body.amount < 10) {
      return errorResponse(new Error("最低充值金额为 10 元"));
    }
    if (!body.paymentProof?.trim()) {
      return errorResponse(new Error("请填写转账凭证号"));
    }

    const amount = Math.floor(body.amount);

    const [deposit] = await db
      .insert(deposits)
      .values({
        userId: user.id,
        amount: String(amount),
        paymentMethod: "manual",
        status: "pending",
        remark: `凭证号: ${body.paymentProof.trim()}${body.remark ? ` | ${body.remark.slice(0, 100)}` : ""}`,
      })
      .returning();

    return ok({
      id: deposit.id,
      amount: deposit.amount,
      status: deposit.status,
      message: "充值申请已提交，管理员将在 1-2 小时内审核",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
