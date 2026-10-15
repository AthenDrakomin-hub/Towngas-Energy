/** 默认文案配置 — 首次启动时写入数据库，管理端可修改 */
export const DEFAULT_CONTENT_CONFIGS = [
  // ── 平台基本信息 ──
  { key: "platform.name", value: "港华智慧能源", category: "platform", description: "平台名称" },
  { key: "platform.fullName", value: "港华智慧能源·零碳园区能源交易平台", category: "platform", description: "平台完整名称" },
  { key: "platform.slogan", value: "致力发展成为绿色智慧能源之领先企业", category: "platform", description: "品牌口号" },
  { key: "platform.subSlogan", value: "创造可持续的绿色能源世界", category: "platform", description: "副标题口号" },
  { key: "platform.disclaimer", value: "虚拟积分，仅供体验 · 不可兑换 · 不可提现 · 无真钱价值", category: "platform", description: "免责声明" },

  // ── 导航菜单 ──
  { key: "nav.home", value: "首页", category: "nav", description: "底部导航-首页" },
  { key: "nav.trading", value: "能源交易", category: "nav", description: "底部导航-交易大厅" },
  { key: "nav.signal", value: "指数研判", category: "nav", description: "底部导航-信号" },
  { key: "nav.leaderboard", value: "节能减排榜", category: "nav", description: "底部导航-排行榜" },
  { key: "nav.me", value: "我的", category: "nav", description: "底部导航-个人中心" },
  { key: "nav.faq", value: "帮助中心", category: "nav", description: "导航-FAQ" },

  // ── 交易大厅 ──
  { key: "trading.title", value: "竞标结果", category: "trading", description: "交易大厅标题" },
  { key: "trading.countdownLabel", value: "竞标截止倒计时", category: "trading", description: "倒计时标签" },
  { key: "trading.betUp", value: "看多", category: "trading", description: "看多按钮" },
  { key: "trading.betDown", value: "看空", category: "trading", description: "看空按钮" },
  { key: "trading.phaseBetting", value: "投资窗口开放", category: "trading", description: "下注阶段状态" },
  { key: "trading.phaseLocked", value: "已锁定 · 等待结算", category: "trading", description: "锁定阶段状态" },
  { key: "trading.phaseSettled", value: "已结算", category: "trading", description: "已结算状态" },
  { key: "trading.upPool", value: "看多池", category: "trading", description: "看多池子" },
  { key: "trading.downPool", value: "看空池", category: "trading", description: "看空池子" },
  { key: "trading.totalPool", value: "总流动性", category: "trading", description: "总池子" },
  { key: "trading.rake", value: "平台服务费", category: "trading", description: "服务费" },
  { key: "trading.signalTitle", value: "能源指数研判 · 五因子评分", category: "trading", description: "信号卡片标题" },
  { key: "trading.logsTitle", value: "运行日志", category: "trading", description: "日志卡片标题" },
  { key: "trading.chartTitle", value: "能源指数走势", category: "trading", description: "走势图标题" },
  { key: "trading.realtimeTitle", value: "实时能源指数", category: "trading", description: "实时指数标题" },
  { key: "trading.leaderboardTitle", value: "节能减排榜", category: "trading", description: "排行榜标题" },
  { key: "trading.announcementTitle", value: "平台公告", category: "trading", description: "公告标题" },
  { key: "trading.myBetsTitle", value: "我的投资份额", category: "trading", description: "我的下注标题" },
  { key: "trading.betAmount", value: "投资份额", category: "trading", description: "下注金额标签" },
  { key: "trading.confirmBet", value: "确认建立投资份额", category: "trading", description: "确认下注按钮" },
  { key: "trading.betSuccess", value: "投资份额已建立", category: "trading", description: "下注成功提示" },

  // ── 登录页 ──
  { key: "login.title", value: "欢迎登录", category: "login", description: "登录页标题" },
  { key: "login.subtitle", value: "港华智慧能源·零碳园区能源交易平台", category: "login", description: "登录页副标题" },
  { key: "login.username", value: "账号", category: "login", description: "用户名输入框" },
  { key: "login.password", value: "密码", category: "login", description: "密码输入框" },
  { key: "login.loginBtn", value: "登 录", category: "login", description: "登录按钮" },
  { key: "login.registerBtn", value: "注册账号", category: "login", description: "注册按钮" },
  { key: "login.rememberMe", value: "记住我", category: "login", description: "记住我" },
  { key: "login.forgotPassword", value: "忘记密码？", category: "login", description: "忘记密码" },

  // ── 个人中心 ──
  { key: "me.title", value: "账户管理", category: "me", description: "个人中心标题" },
  { key: "me.balance", value: "账户余额", category: "me", description: "余额标签" },
  { key: "me.carbonPoints", value: "碳积分", category: "me", description: "积分名称" },
  { key: "me.totalProfit", value: "累计收益", category: "me", description: "累计收益" },
  { key: "me.todayProfit", value: "今日收益", category: "me", description: "今日收益" },
  { key: "me.betHistory", value: "投资记录", category: "me", description: "下注记录" },
  { key: "me.achievements", value: "我的成就", category: "me", description: "成就" },
  { key: "me.settings", value: "设置", category: "me", description: "设置" },
  { key: "me.logout", value: "退出登录", category: "me", description: "退出登录" },
  { key: "me.savings", value: "账户储蓄", category: "me", description: "储蓄卡片" },
  { key: "me.notifications", value: "通知中心", category: "me", description: "通知卡片" },
  { key: "me.customerService", value: "在线客服", category: "me", description: "客服卡片" },

  // ── 管理端 ──
  { key: "admin.dashboard", value: "数据看板", category: "admin", description: "管理端-看板" },
  { key: "admin.users", value: "用户管理", category: "admin", description: "管理端-用户" },
  { key: "admin.rounds", value: "周期管理", category: "admin", description: "管理端-周期" },
  { key: "admin.content", value: "内容管理", category: "admin", description: "管理端-内容" },
  { key: "admin.points", value: "积分管理", category: "admin", description: "管理端-积分" },
  { key: "admin.results", value: "结果管理", category: "admin", description: "管理端-结果" },
  { key: "admin.logs", value: "系统日志", category: "admin", description: "管理端-日志" },
  { key: "admin.contentConfig", value: "文案配置", category: "admin", description: "管理端-文案配置" },

  // ── 周期标签 ──
  { key: "period.1m", value: "极速 1分", category: "period", description: "1分钟周期标签" },
  { key: "period.5m", value: "极速 5分", category: "period", description: "5分钟周期标签" },
  { key: "period.10m", value: "标准 10分", category: "period", description: "10分钟周期标签" },
  { key: "period.15m", value: "稳健 15分", category: "period", description: "15分钟周期标签" },
  { key: "period.30m", value: "长线 30分", category: "period", description: "30分钟周期标签" },

  // ── 通用 ──
  { key: "common.loading", value: "加载中...", category: "common", description: "加载提示" },
  { key: "common.empty", value: "暂无数据", category: "common", description: "空数据提示" },
  { key: "common.save", value: "保存", category: "common", description: "保存按钮" },
  { key: "common.cancel", value: "取消", category: "common", description: "取消按钮" },
  { key: "common.confirm", value: "确认", category: "common", description: "确认按钮" },
  { key: "common.success", value: "操作成功", category: "common", description: "成功提示" },
  { key: "common.error", value: "操作失败", category: "common", description: "失败提示" },
  { key: "common.search", value: "搜索", category: "common", description: "搜索框" },
  { key: "common.all", value: "全部", category: "common", description: "全部筛选" },
] as const;

export type ContentConfigKey = (typeof DEFAULT_CONTENT_CONFIGS)[number]["key"];
