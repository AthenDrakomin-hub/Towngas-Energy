import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/** 用户表 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    nickname: text("nickname").notNull(),
    avatar: text("avatar"),
    // user | admin | ops | finance | observer | support | system | bot
    role: text("role").notNull().default("user"),
    // active | banned | shadow_banned | cooldown
    status: text("status").notNull().default("active"),
  realName: text("real_name"),
  idCard: text("id_card"),
  kycStatus: text("kyc_status").default("pending"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_username_uq").on(t.username), index("users_status_idx").on(t.status)],
);

/** 积分账户（碳积分 碳积分） */
export const accounts = pgTable("accounts", {
  userId: integer("user_id").primaryKey(),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  frozen: bigint("frozen", { mode: "number" }).notNull().default(0),
  lifetimeGrant: bigint("lifetime_grant", { mode: "number" }).notNull().default(0),
  lifetimeRake: bigint("lifetime_rake", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** 积分流水 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    // bet | payout | refund | rake | adjust | signin | task | grant | absorb
    type: text("type").notNull(),
    refId: text("ref_id"),
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    remark: text("remark").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ledger_user_idx").on(t.userId), index("ledger_created_idx").on(t.createdAt)],
);

/** 演算周期 */
export const rounds = pgTable(
  "rounds",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    assetSymbol: text("asset_symbol").notNull().default("EEI-CN-SZ"),
    // 1m | 5m | 10m | 15m | 30m
    periodType: text("period_type").notNull().default("5m"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    lockTime: timestamp("lock_time", { withTimezone: true }).notNull(),
    settleTime: timestamp("settle_time", { withTimezone: true }).notNull(),
    // betting | locked | settling | settled | cancelled
    status: text("status").notNull().default("betting"),
    totalPool: bigint("total_pool", { mode: "number" }).notNull().default(0),
    upPool: bigint("up_pool", { mode: "number" }).notNull().default(0),
    downPool: bigint("down_pool", { mode: "number" }).notNull().default(0),
    rakeRate: real("rake_rate").notNull().default(0.05),
    rakeAmount: bigint("rake_amount", { mode: "number" }).notNull().default(0),
    // up | down | draw | void
    result: text("result"),
    // rule_a | rule_b | admin_override | collector_gap | cancelled
    resultSource: text("result_source"),
    settleCar: jsonb("settle_car").$type<number[]>(),
    participants: integer("participants").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("rounds_code_uq").on(t.code),
    index("rounds_status_idx").on(t.status),
    index("rounds_start_idx").on(t.startTime),
    index("rounds_period_idx").on(t.periodType),
  ],
);

/** 投资份额 */
export const bets = pgTable(
  "bets",
  {
    id: serial("id").primaryKey(),
    roundId: integer("round_id").notNull(),
    userId: integer("user_id").notNull(),
    // up | down
    side: text("side").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    payout: bigint("payout", { mode: "number" }).notNull().default(0),
    // open | won | lost | refunded | absorbed
    status: text("status").notNull().default("open"),
    isFake: boolean("is_fake").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("bets_round_idx").on(t.roundId),
    index("bets_user_idx").on(t.userId),
    index("bets_created_idx").on(t.createdAt),
  ],
);

/** 周期结算记录 */
export const roundSettlements = pgTable(
  "round_settlements",
  {
    id: serial("id").primaryKey(),
    roundId: integer("round_id").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    settlementCar: jsonb("settlement_car").$type<number[]>(),
    settlementOnlinetime: timestamp("settlement_onlinetime", { withTimezone: true }),
    settlementOnlineCount: bigint("settlement_online_count", { mode: "number" }),
    result: text("result").notNull(),
    resultSource: text("result_source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("round_settlements_round_idx").on(t.roundId)],
);

/** 采集数据（能源生态指数 EEI） */
export const carResults = pgTable(
  "car_results",
  {
    id: serial("id").primaryKey(),
    onlinetime: timestamp("onlinetime", { withTimezone: true }).notNull(),
    car: jsonb("car").$type<number[]>().notNull(),
    onlineCount: bigint("online_count", { mode: "number" }),
    hashValue: text("hash_value"),
    source: text("source").notNull().default("es77"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("car_onlinetime_uq").on(t.onlinetime), index("car_created_idx").on(t.createdAt)],
);

/** 管理操作日志 */
export const adminLogs = pgTable(
  "admin_logs",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull().default(""),
    targetId: text("target_id").notNull().default(""),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("admin_logs_created_idx").on(t.createdAt)],
);

/** 公告 */
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  // info | warning | maintenance | signal
  type: text("type").notNull().default("info"),
  // draft | published | offline
  status: text("status").notNull().default("published"),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** 成就 */
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("◎"),
  condition: jsonb("condition").$type<{ metric: string; op: string; value: number }>().notNull(),
  reward: bigint("reward", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    achievementCode: text("achievement_code").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_ach_uq").on(t.userId, t.achievementCode)],
);

/** 会话 */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** 任务 */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  reward: bigint("reward", { mode: "number" }).notNull().default(0),
  metric: text("metric").notNull().default("manual"),
  target: integer("target").notNull().default(1),
  active: boolean("active").notNull().default(true),
});

export const userTasks = pgTable(
  "user_tasks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    taskCode: text("task_code").notNull(),
    dateKey: text("date_key").notNull(),
    progress: integer("progress").notNull().default(0),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("user_tasks_uq").on(t.userId, t.taskCode, t.dateKey)],
);

/** 能源指数研判 */
export const signals = pgTable(
  "signals",
  {
    id: serial("id").primaryKey(),
    roundId: integer("round_id").notNull(),
    roundCode: text("round_code").notNull(),
    direction: text("direction").notNull(),
    confidence: real("confidence").notNull(),
    factors: jsonb("factors")
      .$type<{ key: string; label: string; value: number }[]>()
      .notNull()
      .default([]),
    latencyMs: real("latency_ms").notNull().default(0),
    accuracy: real("accuracy").notNull().default(51.3),
    template: text("template").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("signals_round_idx").on(t.roundId)],
);

/** 星云运行日志（终端） */
export const terminalLogs = pgTable(
  "terminal_logs",
  {
    id: serial("id").primaryKey(),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    level: text("level").notNull().default("info"),
    module: text("module").notNull().default("系统"),
    message: text("message").notNull(),
  },
  (t) => [index("terminal_ts_idx").on(t.ts)],
);

/** 平台配置 */
export const platformConfig = pgTable("platform_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** 结果覆盖指令 */
export const resultOverrides = pgTable(
  "result_overrides",
  {
    id: serial("id").primaryKey(),
    roundId: integer("round_id"),
    roundCode: text("round_code"),
    direction: text("direction").notNull(),
    note: text("note").notNull().default(""),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("overrides_round_idx").on(t.roundId)],
);

/** 采集健康度 */
export const collectorRuns = pgTable(
  "collector_runs",
  {
    id: serial("id").primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    ok: boolean("ok").notNull().default(true),
    records: integer("records").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    error: text("error"),
  },
  (t) => [index("collector_runs_idx").on(t.startedAt)],
);

/** 文案配置表 — 管理端可动态修改所有用户可见文案 */
export const contentConfigs = pgTable(
  "content_configs",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    category: text("category").notNull().default("platform"),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("content_configs_key_uq").on(t.key),
    index("content_configs_category_idx").on(t.category),
  ],
);

/** 充值记录 */
export const deposits = pgTable(
  "deposits",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    // pending | approved | rejected
    status: text("status").notNull().default("pending"),
    paymentMethod: text("payment_method").notNull().default("bank_transfer"),
    paymentProof: text("payment_proof"),
    remark: text("remark"),
    reviewedBy: integer("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("deposits_user_idx").on(t.userId),
    index("deposits_status_idx").on(t.status),
    index("deposits_created_idx").on(t.createdAt),
  ],
);

/** 提现记录 */
export const withdrawals = pgTable(
  "withdrawals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    fee: bigint("fee", { mode: "number" }).notNull().default(0),
    actualAmount: bigint("actual_amount", { mode: "number" }).notNull(),
    // pending | approved | rejected | paid
    status: text("status").notNull().default("pending"),
    withdrawAccount: text("withdraw_account").notNull(),
    withdrawName: text("withdraw_name").notNull(),
    remark: text("remark"),
    reviewedBy: integer("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("withdrawals_user_idx").on(t.userId),
    index("withdrawals_status_idx").on(t.status),
    index("withdrawals_created_idx").on(t.createdAt),
  ],
);


/** 用户通知 */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    type: text("type").notNull().default("info"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_read_idx").on(t.isRead),
  ],
);


/** 前端错误日志 */
export const errorLogs = pgTable(
  "error_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    message: text("message").notNull(),
    stack: text("stack"),
    url: text("url").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("error_logs_created_idx").on(t.createdAt),
    index("error_logs_user_idx").on(t.userId),
  ],
);

/** 登录尝试记录（用于暴力破解限流） */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: varchar("ip", { length: 45 }).notNull(),
    username: varchar("username", { length: 50 }),
    success: boolean("success").notNull().default(false),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("login_attempts_ip_idx").on(t.ip),
    index("login_attempts_created_idx").on(t.createdAt),
  ],
);
