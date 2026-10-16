# Carbon Nebula（港华智慧能源·零碳园区能源交易平台）

Next.js 16 + TypeScript + Drizzle ORM + PostgreSQL 全栈投资竞猜平台。

## 技术栈

- **框架**: Next.js 16.2 App Router (standalone 输出)
- **语言**: TypeScript 5.9
- **ORM**: Drizzle ORM 0.45
- **数据库**: PostgreSQL 16
- **密码哈希**: scrypt（兼容旧版 SHA256+salt）
- **状态管理**: @tanstack/react-query 5 + zustand 5
- **样式**: Tailwind CSS 4
- **图表**: ECharts 5
- **部署**: Docker (Node 22 Alpine)

## 核心功能

### 投资竞猜系统
- **5种周期**: 1分钟 / 5分钟 / 10分钟 / 15分钟 / 30分钟
- **双规则结算**:
  - 规则A：末位奇偶 + 和值奇偶（基于赛车数据）
  - 规则B：AI 信号仲裁（55%权重，五因子评分）
  - 支持 admin_override 人工干预
- **做市流动性**: 24个 bot 节点自动补充弱势方，bot投注结算直接吸收
- **服务费**: 5%（负期望结构，平台盈利）
- **实时推送**: SSE 多频率分级（1s轮次/5s行情/3s日志/10s榜单/30s公告）

### 游戏化系统
- 6种成就（首投/连胜/大额/签到等）
- 每日任务 + 签到奖励
- 日/周/总排行榜

### 风控合规
- 每日投注上限
- 冷静期机制（cooldown）
- 影子封禁（shadow_banned，投注标记fake不影响池子）
- 登录限流（15分钟内失败5次锁定）
- KYC 实名认证
- 页面底部"虚拟积分，仅供体验"声明

### 管理后台（12个页面）
- 看板 / 轮次管理 / 结果管理 / 积分管理 / 用户管理
- 充值提现审核 / 内容管理 / 公告管理 / 日志 / 错误监控
- 采集器控制 / 信号模板

## 快速开始

### 1. 环境配置

```bash
cp .env.example .env
# 编辑 .env，填入数据库连接和 Okpay 配置
```

### 2. 安装依赖

```bash
npm install
```

### 3. 初始化数据库

```bash
# 方式一：直接执行 SQL（推荐，包含全部26张表）
psql -U cnx -d cnx_prod -f sql/001_init.sql

# 方式二：使用 drizzle-kit
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

首次启动自动执行 bootstrap：创建管理员/运营/财务/demo/24bot 账号，采集真实数据并回放360分钟历史。

## 项目结构

```
src/
├── app/
│   ├── api/                    # API 路由（47个端点）
│   │   ├── auth/               # 认证（login/register/[action]，scrypt+限流）
│   │   ├── wallet/             # 钱包（充值/提现/历史/Okpay回调）
│   │   ├── rounds/             # 轮次（current/[id]/bets/history）
│   │   ├── admin/              # 管理端（12个模块）
│   │   ├── signal/             # 投资信号
│   │   ├── stream/             # SSE 实时推送
│   │   ├── engine/tick/        # 引擎心跳（管理员专用）
│   │   ├── kyc/                # 实名认证
│   │   ├── notifications/      # 通知
│   │   ├── tasks/              # 任务系统
│   │   ├── leaderboard/        # 排行榜
│   │   └── health/             # 健康检查
│   ├── signal/                 # 投资中心页面
│   ├── terminal/               # 交易终端
│   ├── me/                     # 个人中心
│   ├── history/                # 交易记录
│   ├── leaderboard/            # 排行榜页面
│   ├── admin/                  # 管理后台页面
│   ├── login/ register/        # 登录注册
│   └── page.tsx                # 主页
├── lib/
│   ├── engine.ts               # 轮次引擎（心跳驱动，自动创建/锁定/结算）
│   ├── settlement.ts           # 结算引擎（规则A+规则B+人工干预）
│   ├── signal.ts               # 信号生成（五因子评分）
│   ├── collector.ts            # 行情采集（对接77tj.org赛车数据）
│   ├── ledger.ts               # 资金账本（原子化余额+流水）
│   ├── gamification.ts         # 游戏化（成就/任务/排行榜）
│   ├── bootstrap.ts            # 启动初始化（种子数据+历史回放）
│   ├── auth.ts                 # 鉴权 + 统一响应 + 登录限流
│   ├── constants.ts            # 角色与权限
│   ├── okpay-config.ts         # Okpay 配置（环境变量，无硬编码）
│   ├── logs.ts                 # 统一日志系统
│   └── format.ts               # 格式化工具
├── components/                 # UI 组件
└── db/
    ├── index.ts                # 数据库连接
    └── schema.ts               # Drizzle Schema（26张表）
```

## 数据库表（26张）

| 分类 | 表名 |
|------|------|
| 用户 | users, accounts, sessions, login_attempts |
| 投资 | rounds, bets, round_settlements, signals |
| 行情 | car_results |
| 资金 | deposits, withdrawals, ledger_entries |
| 游戏化 | achievements, user_achievements, tasks, user_tasks, signin_records |
| 内容 | announcements, notifications, content_configs |
| 管理 | admin_logs, error_reports, signal_templates |
| 系统 | kyc_verifications, payment_configs |

## 安全修复记录

| # | 修复项 | 文件 | 说明 |
|---|--------|------|------|
| 1 | Okpay 密钥环境变量化 | `src/lib/okpay-config.ts` | 移除硬编码 secret，缺失时 assertOkpayConfig 抛错 |
| 2 | 密码哈希统一 scrypt | `src/lib/auth.ts` + `api/auth/*` | SHA256+salt → scrypt，verifyPassword 兼容旧版 |
| 3 | 登录接口限流 | `src/lib/auth.ts` + `login_attempts` 表 | 15分钟内失败5次锁定 |
| 4 | 资金操作事务化 | wallet/withdraw, admin/wallet, okpay/callback | db.transaction() 原子化 |
| 5 | 提现流水 balanceAfter 修正 | `src/app/api/admin/wallet/[action]/route.ts` | 从写死0改为查询实际余额 |
| 6 | 投注重复扣款修复 | `src/app/api/rounds/[id]/bets/route.ts` | 移除路由层手动扣款，交由 placeBet 内部 applyLedger 统一处理 |
| 7 | 系统日志权限校验 | `src/app/api/logs/route.ts` | 添加 requireScope，防止未授权访问 |
| 8 | 引擎心跳权限校验 | `src/app/api/engine/tick/route.ts` | 限制管理员调用，防止恶意触发采集 |

## 风控规则

- 新用户注册 24 小时内禁止提现
- 新用户（<7天）单笔提现限额减半
- 每日提现上限 ¥5000
- 每小时最多 3 次提现申请
- 单笔提现 ≥ ¥10000 触发大额告警
- 提现手续费 5%
- 每日投注上限（可配置）
- 冷静期机制（连续亏损后强制休息）

## 部署

### Docker Compose（推荐）

```bash
# 复制并编辑环境变量
cp .env.example .env

# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f app
```

### 手动 Docker

```bash
# 构建
docker build -t carbon-nebula .

# 运行
docker run -d \
  --name carbon-nebula \
  -p 3000:3000 \
  --env-file .env \
  carbon-nebula
```

### 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| DATABASE_URL | PostgreSQL 连接串 | 是 |
| OKPAY_APP_ID | Okpay 商户 App ID | 充值功能必填 |
| OKPAY_SECRET | Okpay 商户密钥 | 充值功能必填 |
| OKPAY_BASE_URL | Okpay API 地址 | 否（默认 https://api.okpay.com） |
| OKPAY_NOTIFY_URL | 支付回调地址 | 充值功能必填 |
| NODE_ENV | 运行环境 | 否（默认 production） |

## 运维脚本

- `backup.sh` — 每日数据库备份（保留7天）
- `monitor.sh` — 每小时监控告警（磁盘/内存/容器/健康检查）

## 引擎驱动说明

投资引擎心跳由 SSE 连接和 API 请求自动触发，无需独立 cron：
- 用户打开 /signal 或 /terminal 页面 → SSE 连接保持 → 每秒触发 tickEngine
- 用户访问 /api/rounds/current、/api/signal 等接口 → 自动触发 tickEngine
- tickEngine 内置 900ms 限频，防止重复执行
- 无人访问时引擎暂停（不影响已结算数据）

## 测试

```bash
# 单元测试
npm run test

# 类型检查
npm run typecheck

# Lint
npm run lint
```
