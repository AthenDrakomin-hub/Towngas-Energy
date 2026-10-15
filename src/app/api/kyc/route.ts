import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 获取实名认证状态 */
export async function GET() {
  try {
    const user = await requireUser();
    const [u] = await db
      .select({
        realName: users.realName,
        idCard: users.idCard,
        kycStatus: users.kycStatus,
      })
      .from(users)
      .where(eq(users.id, user.id));

    return ok({
      realName: u?.realName || "",
      idCard: u?.idCard || "",
      kycStatus: u?.kycStatus || "pending",
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** 提交实名认证 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      realName?: string;
      idCard?: string;
    };

    if (!body.realName || body.realName.length < 2) {
      return errorResponse(new Error("请输入真实姓名"));
    }

    if (!body.idCard || !/^\d{15}$|^\d{18}$/.test(body.idCard)) {
      return errorResponse(new Error("请输入正确的身份证号码"));
    }

    await db
      .update(users)
      .set({
        realName: body.realName,
        idCard: body.idCard,
        kycStatus: "verified", // 平台内自动通过
      })
      .where(eq(users.id, user.id));

    return ok({
      message: "实名认证成功",
      kycStatus: "verified",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
