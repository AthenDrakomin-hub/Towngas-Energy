/**
 * Okpay 商户配置
 * 所有敏感配置必须通过环境变量注入，禁止在代码中硬编码真实密钥
 *
 * 环境变量清单：
 *   OKPAY_APP_ID      商户 App ID
 *   OKPAY_SECRET      商户签名密钥
 *   OKPAY_BASE_URL    API 基础地址
 *   OKPAY_NOTIFY_URL  支付回调地址
 */
export const OKPAY_CONFIG = {
  appId: process.env.OKPAY_APP_ID || "",
  secret: process.env.OKPAY_SECRET || "",
  baseUrl: process.env.OKPAY_BASE_URL || "https://api.okpay.com",
  notifyUrl: process.env.OKPAY_NOTIFY_URL || "",
};

/** 运行时校验 Okpay 配置，缺失时抛出明确错误 */
export function assertOkpayConfig() {
  const missing: string[] = [];
  if (!OKPAY_CONFIG.appId) missing.push("OKPAY_APP_ID");
  if (!OKPAY_CONFIG.secret) missing.push("OKPAY_SECRET");
  if (!OKPAY_CONFIG.notifyUrl) missing.push("OKPAY_NOTIFY_URL");
  if (missing.length > 0) {
    throw new Error(`[OKPAY] 缺少必要环境变量：${missing.join(", ")}，请在部署环境中配置后再使用充值功能`);
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

  const str = sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + `&key=${OKPAY_CONFIG.secret}`;

  const crypto = require("crypto");
  return crypto.createHash("md5").update(str).digest("hex").toUpperCase();
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
