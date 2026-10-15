# Carbon Nebula（港华智慧能源）

Next.js 14 + TypeScript + Drizzle ORM + PostgreSQL 全栈投资平台。

## 技术栈

- **框架**: Next.js 14 App Router (standalone 输出)
- **语言**: TypeScript 5.6
- **ORM**: Drizzle ORM 0.33
- **数据库**: PostgreSQL 14+
- **密码哈希**: bcryptjs（10轮盐）
- **状态管理**: @tanstack/react-query
- **样式**: Tailwind CSS + 自定义 UI 组件
- **部署**: Docker (Node 22 Alpine)

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
# 方式一：直接执行 SQL
psql -U cnx -d cnx_prod -f sql/001_init.sql

# 方式二：使用 drizzle-kit
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

默认管理员账号：`admin` / `admin123`（生产环境请立即修改）

## 项目结构

```
src/
├── app/
│   ├── api/                    # API 路由
│   │   ├── auth/               # 认证（登录/注册，bcrypt+限流）
│   │   ├── wallet/             # 钱包（充值/提现/历史/Okpay）
│   │   ├── admin/              # 管理端（用户/资金/配置/错误）
│   │   ├── kyc/                # 实名认证
│   │   ├── notifications/      # 通知
│   │   ├── error-report/       # 前端错误上报
│   │   └── health/             # 健康检查
│   ├── admin/                  # 管理端页面
│   ├── wallet/                 # 钱包页面
│   ├── kyc/                    # KYC 页面
│   ├── login/                  # 登录页
│   ├── register/               # 注册页
│   └── page.tsx                # 主页
├── components/
│   ├── ui/                     # UI 组件（Card/Button/Input）
│   ├── Shell.tsx               # 会话上下文
│   ├── ClientNav.tsx           # 客户端导航
│   └── ThemeToggle.tsx         # 主题切换
├── lib/
│   ├── auth.ts                 # 鉴权 + 统一响应 + 登录限流
│   ├── constants.ts            # 角色与权限
│   ├── okpay-config.ts         # Okpay 配置（环境变量）
│   └── format.ts               # 格式化工具
└── db/
    ├── index.ts                # 数据库连接
    └── schema.ts               # Drizzle Schema
```

## 安全修复记录

| # | 修复项 | 文件 | 说明 |
|---|--------|------|------|
| 1 | Okpay 密钥环境变量化 | `src/lib/okpay-config.ts` | 移除硬编码 secret，运行时校验 |
| 2 | 密码哈希升级 bcrypt | `src/app/api/auth/*/route.ts` | SHA256+salt → bcryptjs 10轮 |
| 3 | 登录接口限流 | `src/lib/auth.ts` + `login_attempts` 表 | 15分钟内失败5次锁定 |
| 4 | 资金操作事务化 | `wallet/withdraw`, `admin/wallet`, `okpay/callback` | db.transaction() + SELECT FOR UPDATE |
| 5 | 提现流水 balanceAfter 修正 | `src/app/api/admin/wallet/[action]/route.ts` | 从写死0改为查询实际余额 |

## 风控规则

- 新用户注册 24 小时内禁止提现
- 新用户（<7天）单笔提现限额减半
- 每日提现上限 ¥5000
- 每小时最多 3 次提现申请
- 单笔提现 ≥ ¥10000 触发大额告警
- 提现手续费 5%

## 部署

```bash
# Docker 构建
docker build -t carbon-nebula .

# Docker 运行
docker run -d \
  --name carbon-nebula \
  -p 3000:3000 \
  --env-file .env \
  carbon-nebula
```

## 运维脚本

- `backup.sh` — 每日数据库备份（保留7天）
- `monitor.sh` — 每小时监控告警（磁盘/内存/容器/健康检查）
