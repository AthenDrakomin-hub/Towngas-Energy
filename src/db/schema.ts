import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";

// ===== 用户与认证 =====
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    nickname: varchar("nickname", { length: 50 }),
    role: varchar("role", { length: 20 }).notNull().default("user"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    realName: varchar("real_name", { length: 50 }),
    idCard: varchar("id_card", { length: 30 }),
    kycStatus: varchar("kyc_status", { length: 20 }).default("pending"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("users_username_idx").on(t.username), index("users_role_idx").on(t.role)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

// ===== 资金 =====
export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id)
      .unique(),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)]
);

export const deposits = pgTable(
  "deposits",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("manual"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    remark: text("remark"),
    reviewedBy: integer("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("deposits_user_idx").on(t.userId),
    index("deposits_status_idx").on(t.status),
    index("deposits_created_idx").on(t.createdAt),
  ]
);

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    fee: numeric("fee", { precision: 14, scale: 2 }).notNull().default("0"),
    actualAmount: numeric("actual_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    withdrawAccount: varchar("withdraw_account", { length: 100 }).notNull(),
    withdrawName: varchar("withdraw_name", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    remark: text("remark"),
    reviewedBy: integer("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("withdrawals_user_idx").on(t.userId),
    index("withdrawals_status_idx").on(t.status),
    index("withdrawals_created_idx").on(t.createdAt),
  ]
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    type: varchar("type", { length: 30 }).notNull(),
    refId: varchar("ref_id", { length: 64 }),
    balanceAfter: numeric("balance_after", { precision: 14, scale: 2 }).notNull().default("0"),
    remark: text("remark"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("ledger_user_idx").on(t.userId),
    index("ledger_type_idx").on(t.type),
    index("ledger_created_idx").on(t.createdAt),
  ]
);

// ===== 通知 =====
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 100 }).notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 20 }).notNull().default("info"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_read_idx").on(t.isRead),
  ]
);

// ===== 平台配置（KV） =====
export const platformConfig = pgTable(
  "platform_config",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 100 }).notNull().unique(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("platform_config_key_idx").on(t.key)]
);

// ===== 错误日志 =====
export const errorLogs = pgTable(
  "error_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    message: text("message").notNull(),
    stack: text("stack"),
    url: text("url").notNull().default("/"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("error_logs_created_idx").on(t.createdAt),
    index("error_logs_user_idx").on(t.userId),
  ]
);

// ===== 登录限流（修复2新增） =====
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: varchar("ip", { length: 45 }).notNull(),
    username: varchar("username", { length: 50 }),
    success: boolean("success").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("login_attempts_ip_idx").on(t.ip),
    index("login_attempts_created_idx").on(t.createdAt),
  ]
);

// 类型导出
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
