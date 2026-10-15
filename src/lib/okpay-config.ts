/**
 * Okpay 商户配置
 * 商户名称：金阳2
 * App ID: 43079
 */
export const OKPAY_CONFIG = {
  appId: process.env.OKPAY_APP_ID || "43079",
  secret: process.env.OKPAY_SECRET || "cmvuVFDbHQwHRLYXqWDTx3bPS9Jy8KOE",
  // TODO: 确认 API 基础地址（商户后台一般有显示）
  baseUrl: process.env.OKPAY_BASE_URL || "https://api.okpay.com",
  // 回调地址（你的服务器接收支付结果的地址）
  notifyUrl: process.env.OKPAY_NOTIFY_URL || "https://goodspage.cn/api/wallet/okpay/callback",
};

/** 运行时校验 Okpay 配置是否已通过环境变量覆盖 */
export function assertOkpayConfig() {
  if (!process.env.OKPAY_APP_ID || !process.env.OKPAY_SECRET) {
    console.warn("[OKPAY] 警告：未配置 OKPAY_APP_ID / OKPAY_SECRET 环境变量，正在使用默认值，生产环境必须覆盖");
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

  // MD5 加密（浏览器端用 crypto-js，服务端用 node crypto）
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
