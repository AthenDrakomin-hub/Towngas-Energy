import { createHash } from "crypto";

/**
 * Okpay 商户配置
 * 所有敏感信息从环境变量读取，禁止硬编码
 */
export const OKPAY_CONFIG = {
  appId: process.env.OKPAY_APP_ID || "",
  secret: process.env.OKPAY_SECRET || "",
  baseUrl: process.env.OKPAY_BASE_URL || "https://api.okpay.com",
  notifyUrl: process.env.OKPAY_NOTIFY_URL || "",
};

/** 运行时校验：缺失关键配置时抛错，避免静默失败 */
export function assertOkpayConfig() {
  if (!OKPAY_CONFIG.appId) {
    throw new Error("OKPAY_APP_ID 环境变量未配置");
  }
  if (!OKPAY_CONFIG.secret) {
    throw new Error("OKPAY_SECRET 环境变量未配置");
  }
  if (!OKPAY_CONFIG.notifyUrl) {
    throw new Error("OKPAY_NOTIFY_URL 环境变量未配置");
  }
}

/**
 * 生成签名（标准 MD5 签名算法）
 * 规则：参数按 key 排序 → 拼接成 key=value&key=value → 末尾加密钥 → MD5
 */
export function generateSign(params: Record<string, string | number>): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== undefined && params[k] !== "")
    .sort();

  const str =
    sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + `&key=${OKPAY_CONFIG.secret}`;

  return createHash("md5").update(str).digest("hex").toUpperCase();
}

/**
 * 验证回调签名
 */
export function verifyCallbackSign(params: Record<string, string>): boolean {
  const sign = params.sign;
  if (!sign) return false;

  const { sign: _, ...rest } = params;
  const expectedSign = generateSign(rest);

  return sign.toUpperCase() === expectedSign;
}
