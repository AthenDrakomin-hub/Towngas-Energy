export const PLATFORM = {
  name: "港华智慧能源",
  fullName: "港华智慧能源·零碳园区能源交易平台",
  version: "2.0",
  node: "CN-SZ-07",
  asset: "EEI-CN-SZ",
  dataStream: "能源综合指数数据源",
  disclaimer: "虚拟积分，仅供体验 · 不可兑换 · 不可提现 · 无真钱价值",
} as const;

export const WINDOW_MS = 5 * 60 * 1000;
export const BETTING_SEC = 240;
export const LOCK_BUFFER_SEC = 30;

/** 多周期配置：5种交易玩法，结算时刻错开 */
export const PERIODS = {
  "1m": {
    key: "1m",
    label: "极速 1分",
    short: "1分",
    windowMs: 60 * 1000,
    bettingSec: 30,
    lockBufferSec: 15,
    settleOffsetSec: 0, // 每分钟整点结算
    minBet: 100,
    maxBetPerRound: 5000,
    color: "#ff4d4f",
  },
  "5m": {
    key: "5m",
    label: "极速 5分",
    short: "5分",
    windowMs: 5 * 60 * 1000,
    bettingSec: 240,
    lockBufferSec: 30,
    settleOffsetSec: 0, // :00 :05 :10...
    minBet: 500,
    maxBetPerRound: 20000,
    color: "#fa8c16",
  },
  "10m": {
    key: "10m",
    label: "标准 10分",
    short: "10分",
    windowMs: 10 * 60 * 1000,
    bettingSec: 480,
    lockBufferSec: 60,
    settleOffsetSec: 3 * 60, // :03 :13 :23...
    minBet: 1000,
    maxBetPerRound: 50000,
    color: "#1890ff",
  },
  "15m": {
    key: "15m",
    label: "稳健 15分",
    short: "15分",
    windowMs: 15 * 60 * 1000,
    bettingSec: 720,
    lockBufferSec: 90,
    settleOffsetSec: 7 * 60, // :07 :22 :37 :52
    minBet: 2000,
    maxBetPerRound: 100000,
    color: "#00a650",
  },
  "30m": {
    key: "30m",
    label: "长线 30分",
    short: "30分",
    windowMs: 30 * 60 * 1000,
    bettingSec: 1500,
    lockBufferSec: 150,
    settleOffsetSec: 11 * 60, // :11 :41
    minBet: 5000,
    maxBetPerRound: 200000,
    color: "#722ed1",
  },
} as const;

export type PeriodKey = keyof typeof PERIODS;
export const PERIOD_KEYS = Object.keys(PERIODS) as PeriodKey[];

export const EEI_DIMS = [
  { index: 0, key: "pv", label: "光伏出力指数", short: "光伏" },
  { index: 1, key: "ess", label: "储能充放指数", short: "储能" },
  { index: 2, key: "load", label: "负荷调节指数", short: "负荷" },
  { index: 3, key: "green", label: "绿电交易指数", short: "绿电" },
  { index: 4, key: "carbon", label: "碳资产流动指数", short: "碳资产" },
  { index: 5, key: "vpp", label: "虚拟电厂调度指数", short: "虚拟电厂" },
  { index: 6, key: "eff", label: "能效管理指数", short: "能效" },
  { index: 7, key: "multi", label: "多能联供指数", short: "多能联供" },
  { index: 8, key: "heat", label: "区域供热指数", short: "供热" },
  { index: 9, key: "composite", label: "生态综合指数", short: "综合" },
] as const;

export const FOUR_PLATFORMS = [
  { key: "green", name: "港华绿电", desc: "绿电交易与绿证服务，助力企业实现100%绿电使用", state: "运行中" },
  { key: "carbon", name: "港华碳资产", desc: "碳资产管理与碳交易，提供ESG咨询与碳信用服务", state: "运行中" },
  { key: "digital", name: "港华数能", desc: "零碳科技与数码化能源管理，智慧运维平台", state: "运行中" },
  { key: "vpp", name: "港华综能", desc: "虚拟电厂与综合能源服务，多能互补一站式方案", state: "运行中" },
] as const;

export const SIGNAL_MODEL = {
  name: "五因子综合评分",
  params: "五因子模型",
  framework: "基于真实能源指数时序数据计算",
  trainingCorpus: "指数时序归档",
  accuracy: 51.3,
  features: ["动量因子", "波动率因子", "资金流因子", "情绪因子", "宏观因子"],
} as const;

/** 命名映射：底层语义 → 官方话术 */
export const NAMING = {
  bet: "建立投资份额",
  bets: "投资份额",
  pool: "能源交易流动性池",
  settle: "周期结算",
  rake: "平台服务费",
  points: "碳积分",
  leaderboard: "节能减排榜",
  odds: "结算率",
  win: "盈利",
  lose: "亏损",
  round: "交易周期",
} as const;

export const ROLES = {
  super: { key: "super", name: "管理员", scope: ["*"] },
  admin: { key: "admin", name: "管理员", scope: ["*"] },
  user: { key: "user", name: "普通用户", scope: [] },
  system: { key: "system", name: "系统账户", scope: [] },
} as const;

export type RoleKey = keyof typeof ROLES;

export function hasScope(role: string, scope: string): boolean {
  const entry = (ROLES as Record<string, { scope: readonly string[] }>)[role];
  if (!entry) return false;
  return entry.scope.includes("*") || entry.scope.includes(scope);
}

export const FAQ = [
  {
    q: "这个平台是做什么的？",
    a: "港华智慧能源·零碳园区能源交易平台，面向园区企业提供绿电交易、碳资产管理、虚拟电厂调度等综合能源服务体验。平台基于真实能源综合指数数据，每5分钟一个交易周期，用户可对指数走向建立投资份额，用于观察和体验能源市场的波动规律。",
  },
  {
    q: "碳积分能换钱吗？",
    a: "不能。碳积分是平台内部的体验记账单位，不可兑换、不可提现、不可转让，与任何法币或加密资产没有锚定关系。平台所有页面均标注「虚拟积分，仅供体验」。",
  },
  {
    q: "结算率是怎么算出来的？",
    a: "结算率是池内投资份额的分配系数：可用流动性池 ÷ 该方向总投资份额。它随两侧投资份额规模实时变化，属于平台的分配机制，仅用于描述结算时的积分分配比例。",
  },
  {
    q: "为什么是负期望结构？",
    a: "每个周期会收取5%平台服务费，用于回收内部积分、抑制积分通胀。这是纯粹的虚拟积分回收机制，不是盈利工具，平台不从中获得任何真实收益。",
  },
  {
    q: "能源指数研判可信吗？",
    a: "五因子综合评分基于真实能源指数时序数据计算，包含动量、波动率、资金流、情绪、宏观五个维度，历史准确率51.3%，仅略高于随机。它用于展示指数分析过程的可解释性，不构成任何投资建议。",
  },
  {
    q: "数据是真实的吗？",
    a: "是。能源指数数据来自公开接口的实时采集，每分钟一条，附带回传在线活跃度。采集失败时周期会被标记为「数据缺口」并按平局退还投资份额，绝不伪造。",
  },
  {
    q: "为什么界面上有这么多面板？",
    a: "港华绿电、港华碳资产、港华数能、港华综能四大业务板块与订单流、运行日志等模块，构成完整的综合能源服务数字底座。这些面板全部由真实采集数据驱动，用于增强平台的专业感和沉浸感。",
  },
  {
    q: "为什么看空方向很少出现？",
    a: "这是数据源的结构特征：指数数组是1-10的全排列，和值恒为55（奇数），因此规则A的双奇偶判定只会产生看多（综合指数末位为奇）或平局（末位为偶）。看空只能由规则B的五因子仲裁或管理端指定产生。该结构已如实标注在结果控制台中。",
  },
  {
    q: "参与频率会不会太高？",
    a: "平台内置每日参与时长提醒、冷静期与单周期投资份额上限。累计在线超过配置时长会弹出提醒，用户可在「我的」中主动开启冷静期。",
  },
] as const;
