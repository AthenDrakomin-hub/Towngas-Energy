import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deposits } from "@/db/schema";
import { errorResponse, ok, requireUser } from "@/lib/auth";
import { OKPAY_CONFIG, generateSign, assertOkpayConfig } from "@/lib/okpay-config";

export const dynamic = "force-dynamic";

/**
 * Okpay 创建充值订单
 * 用户发起充值 → 本地创建 pending 记录 → 调用 Okpay API → 返回支付信息
 */
export async function POST(req: Request) {
  try {
    assertOkpayConfig();
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      amount?: number;
    };

    if (!body.amount || body.amount < 10) {
      return errorResponse(new Error("最低充值金额为 10 元"));
    }

    const amount = Math.floor(body.amount);
    const orderId = `DEP${Date.now()}${randomUUID().slice(0, 8)}`;

    // 1. 先在本地创建充值记录（状态 pending）
    const [deposit] = await db
      .insert(deposits)
      .values({
        userId: user.id,
        amount,
        paymentMethod: "okpay_usdt",
        status: "pending",
        remark: `Okpay 订单号: ${orderId}`,
      })
      .returning();

    // 2. 调用 Okpay 创建订单接口
    const params: Record<string, string | number> = {
      appid: OKPAY_CONFIG.appId,
      amount: amount.toFixed(2),
      order_id: orderId,
      notify_url: OKPAY_CONFIG.notifyUrl,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://goodspage.cn"}/wallet?tab=history`,
    };

    const sign = generateSign(params);
    const createOrderUrl = `${OKPAY_CONFIG.baseUrl}/api/order/create`;

    const response = await fetch(createOrderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, sign }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      code?: number;
      msg?: string;
      data?: {
        pay_url?: string;
        qr_code_url?: string;
        address?: string;
        qr_code?: string;
      };
    };

    if (result.code !== 0 && result.code !== 200) {
      // 创建失败，更新本地记录
      await db
        .update(deposits)
        .set({ status: "rejected", remark: `Okpay 创建失败: ${result.msg || "未知错误"}` })
        .where(eq(deposits.id, deposit.id));

      return errorResponse(new Error(`支付通道创建订单失败: ${result.msg || "请稍后重试"}`));
    }

    // 3. 返回支付信息给前端
    return ok({
      depositId: deposit.id,
      orderId,
      amount,
      payUrl: result.data?.pay_url || result.data?.qr_code_url,
      payAddress: result.data?.address,
      qrCode: result.data?.qr_code,
      message: "订单创建成功，请扫码支付",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
