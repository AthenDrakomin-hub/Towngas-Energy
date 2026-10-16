-- ============================================================
-- Carbon Nebula（港华智慧能源）数据库初始化脚本
-- 共 25 张表，对应 src/db/schema.ts
-- 执行方式：psql -U cnx -d cnx_prod -f sql/001_init.sql
-- ============================================================

-- ===== 用户与认证 =====

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  real_name TEXT,
  id_card TEXT,
  kyc_status TEXT DEFAULT 'pending',
  tags JSONB NOT NULL DEFAULT '[]',
  last_login_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uq ON users (username);
CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  username VARCHAR(50),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts (ip);
CREATE INDEX IF NOT EXISTS login_attempts_created_idx ON login_attempts (created_at);

-- ===== 资金账户 =====

CREATE TABLE IF NOT EXISTS accounts (
  user_id INTEGER PRIMARY KEY,
  balance BIGINT NOT NULL DEFAULT 0,
  frozen BIGINT NOT NULL DEFAULT 0,
  lifetime_grant BIGINT NOT NULL DEFAULT 0,
  lifetime_rake BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL,
  ref_id TEXT,
  balance_after BIGINT NOT NULL,
  remark TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ledger_user_idx ON ledger_entries (user_id);
CREATE INDEX IF NOT EXISTS ledger_created_idx ON ledger_entries (created_at);

CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_proof TEXT,
  remark TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deposits_user_idx ON deposits (user_id);
CREATE INDEX IF NOT EXISTS deposits_status_idx ON deposits (status);
CREATE INDEX IF NOT EXISTS deposits_created_idx ON deposits (created_at);

CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  fee BIGINT NOT NULL DEFAULT 0,
  actual_amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  withdraw_account TEXT NOT NULL,
  withdraw_name TEXT NOT NULL,
  remark TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS withdrawals_user_idx ON withdrawals (user_id);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals (status);
CREATE INDEX IF NOT EXISTS withdrawals_created_idx ON withdrawals (created_at);

-- ===== 投资竞猜核心 =====

CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  asset_symbol TEXT NOT NULL DEFAULT 'EEI-CN-SZ',
  period_type TEXT NOT NULL DEFAULT '5m',
  start_time TIMESTAMPTZ NOT NULL,
  lock_time TIMESTAMPTZ NOT NULL,
  settle_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'betting',
  total_pool BIGINT NOT NULL DEFAULT 0,
  up_pool BIGINT NOT NULL DEFAULT 0,
  down_pool BIGINT NOT NULL DEFAULT 0,
  rake_rate REAL NOT NULL DEFAULT 0.05,
  rake_amount BIGINT NOT NULL DEFAULT 0,
  result TEXT,
  result_source TEXT,
  settle_car JSONB,
  participants INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS rounds_code_uq ON rounds (code);
CREATE INDEX IF NOT EXISTS rounds_status_idx ON rounds (status);
CREATE INDEX IF NOT EXISTS rounds_start_idx ON rounds (start_time);
CREATE INDEX IF NOT EXISTS rounds_period_idx ON rounds (period_type);

CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  side TEXT NOT NULL,
  amount BIGINT NOT NULL,
  payout BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  is_fake BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bets_round_idx ON bets (round_id);
CREATE INDEX IF NOT EXISTS bets_user_idx ON bets (user_id);
CREATE INDEX IF NOT EXISTS bets_created_idx ON bets (created_at);

CREATE TABLE IF NOT EXISTS round_settlements (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  settlement_car JSONB,
  settlement_onlinetime TIMESTAMPTZ,
  settlement_online_count BIGINT,
  result TEXT NOT NULL,
  result_source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS round_settlements_round_idx ON round_settlements (round_id);

CREATE TABLE IF NOT EXISTS result_overrides (
  id SERIAL PRIMARY KEY,
  round_id INTEGER,
  round_code TEXT,
  direction TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  applied_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS overrides_round_idx ON result_overrides (round_id);

-- ===== 行情采集 =====

CREATE TABLE IF NOT EXISTS car_results (
  id SERIAL PRIMARY KEY,
  onlinetime TIMESTAMPTZ NOT NULL,
  car JSONB NOT NULL,
  online_count BIGINT,
  hash_value TEXT,
  source TEXT NOT NULL DEFAULT 'es77',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS car_onlinetime_uq ON car_results (onlinetime);
CREATE INDEX IF NOT EXISTS car_created_idx ON car_results (created_at);

CREATE TABLE IF NOT EXISTS collector_runs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ok BOOLEAN NOT NULL DEFAULT TRUE,
  records INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
CREATE INDEX IF NOT EXISTS collector_runs_idx ON collector_runs (started_at);

-- ===== 信号系统 =====

CREATE TABLE IF NOT EXISTS signals (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL,
  round_code TEXT NOT NULL,
  direction TEXT NOT NULL,
  confidence REAL NOT NULL,
  factors JSONB NOT NULL DEFAULT '[]',
  latency_ms REAL NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 51.3,
  template TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS signals_round_idx ON signals (round_id);

-- ===== 游戏化 =====

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '◎',
  condition JSONB NOT NULL,
  reward BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  achievement_code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_ach_uq ON user_achievements (user_id, achievement_code);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reward BIGINT NOT NULL DEFAULT 0,
  metric TEXT NOT NULL DEFAULT 'manual',
  target INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  task_code TEXT NOT NULL,
  date_key TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS user_tasks_uq ON user_tasks (user_id, task_code, date_key);

-- ===== 内容与通知 =====

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'published',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (is_read);

CREATE TABLE IF NOT EXISTS content_configs (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'platform',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS content_configs_key_uq ON content_configs (key);
CREATE INDEX IF NOT EXISTS content_configs_category_idx ON content_configs (category);

-- ===== 系统与管理 =====

CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_logs_created_idx ON admin_logs (created_at);

CREATE TABLE IF NOT EXISTS terminal_logs (
  id SERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL DEFAULT 'info',
  module TEXT NOT NULL DEFAULT '系统',
  message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS terminal_ts_idx ON terminal_logs (ts);

CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS error_logs_created_idx ON error_logs (created_at);
CREATE INDEX IF NOT EXISTS error_logs_user_idx ON error_logs (user_id);

-- ============================================================
-- 初始化完成
-- 表数量：25 张
-- ============================================================
