"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Shell, useSession } from "@/components/Shell";
import { Button } from "@/components/ui/form/Button";
import { EChart } from "@/components/EChart";
import type { EChartsOption } from "echarts";
import { fmtInt, fmtPct, fmtSigned } from "@/lib/format";
import { ColorCard, Tag, Progress, Empty, Alert } from "@/components/ui/enterprise";

const LEDGER_LABEL: Record<string, string> = {
  bet: "建立投资份额",
  payout: "清算收益",
  refund: "平局退还",
  rake: "服务费",
  adjust: "管理端调整",
  signin: "每日签到",
  task: "生态任务",
  grant: "积分发放",
  absorb: "流动性回收",
};

const ACH_NAMES: Record<string, { name: string; icon: string }> = {
  first_step: { name: "首次建仓", icon: "◈" },
  ten_rounds: { name: "周期常客", icon: "◇" },
  half_century: { name: "星云守望者", icon: "◉" },
  sharp_eye: { name: "结构洞察", icon: "◆" },
  profit_10k: { name: "生态贡献者", icon: "★" },
  volume_100k: { name: "流动性支柱", icon: "▣" },
};

const MENU = [
  { key: "info", label: "账户信息", icon: "👤" },
  { key: "manage", label: "账户管理", icon: "⚙️" },
  { key: "funds", label: "资金管理", icon: "💰" },
  { key: "trades", label: "交易记录", icon: "📊" },
];

export default function MePage() {
  const { data: session } = useSession();
  const me = session?.data ?? null;
  const [menu, setMenu] = useState<"info" | "manage" | "funds" | "trades">("info");
  const [subTab, setSubTab] = useState<"bets" | "ledger" | "curve">("bets");
  const [days, setDays] = useState(30);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCooldownUntil(Number(localStorage.getItem("cnx_cooldown_until") ?? 0));
  }, []);

  const stats = useQuery({
    queryKey: ["me-stats"],
    enabled: Boolean(me),
    queryFn: async () => (await fetch("/api/me/stats")).json(),
    refetchInterval: 10000,
  });
  const bets = useQuery({
    queryKey: ["me-bets"],
    enabled: Boolean(me),
    queryFn: async () => (await fetch("/api/me/bets?limit=80")).json(),
    refetchInterval: 12000,
  });
  const ledger = useQuery({
    queryKey: ["me-ledger"],
    enabled: Boolean(me),
    queryFn: async () => (await fetch("/api/me/ledger?limit=80")).json(),
    refetchInterval: 12000,
  });
  const curve = useQuery({
    queryKey: ["me-curve", days],
    enabled: Boolean(me) && subTab === "curve",
    queryFn: async () => (await fetch(`/api/me/curve?days=${days}`)).json(),
  });
  const tasks = useQuery({
    queryKey: ["me-tasks"],
    enabled: Boolean(me),
    queryFn: async () => (await fetch("/api/tasks")).json(),
    refetchInterval: 20000,
  });
  const achievements = useQuery({
    queryKey: ["me-ach"],
    enabled: Boolean(me),
    queryFn: async () => (await fetch("/api/me/achievements")).json(),
  });

  if (!me) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-sm text-gray-500">尚未接入平台，无法查看生态资产</p>
          <Link href="/login">
            <Button>接入平台</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const s = stats.data?.data ?? {};
  const curveRows: { day: string; profit: number }[] = curve.data?.data ?? [];
  const curveOption: EChartsOption | null = curveRows.length
    ? {
        backgroundColor: "transparent",
        grid: { left: 52, right: 14, top: 24, bottom: 26 },
        tooltip: { trigger: "axis", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "#e5e7eb", textStyle: { fontSize: 11, color: "#1f2937" } },
        xAxis: { type: "category", data: curveRows.map((r) => r.day), axisLine: { lineStyle: { color: "#e5e7eb" } }, axisLabel: { color: "#9ca3af", fontSize: 10 }, splitLine: { show: false } },
        yAxis: { type: "value", axisLine: { show: false }, axisLabel: { color: "#9ca3af", fontSize: 10 }, splitLine: { lineStyle: { color: "#f3f4f6" } } },
        series: [
          {
            name: "累计盈亏",
            type: "line",
            data: curveRows.reduce<number[]>((acc, r) => [...acc, (acc[acc.length - 1] ?? 0) + r.profit], []),
            smooth: true,
            symbol: "none",
            lineStyle: { color: "#00a650", width: 2 },
            areaStyle: { color: "rgba(0,166,80,0.08)" },
          },
        ],
      }
    : null;

  const doSignin = async () => {
    const res = await fetch("/api/signin", { method: "POST" });
    const json = await res.json();
    setToast(json.ok ? `签到成功 +${fmtInt(json.data.reward)} 碳积分` : json.message);
    setTimeout(() => setToast(null), 3000);
  };

  const claim = async (code: string) => {
    const res = await fetch(`/api/tasks/${code}/claim`, { method: "POST" });
    const json = await res.json();
    setToast(json.ok ? `任务奖励 +${fmtInt(json.data.reward)} 碳积分` : json.message);
    setTimeout(() => setToast(null), 3000);
    tasks.refetch();
  };

  const cooldownLeft = Math.max(0, cooldownUntil - Date.now());

  return (
    <Shell>
      <div className="mx-auto max-w-7xl">
        {toast && (
          <div className="mb-4 rounded-lg border border-[#f5a623]/30 bg-[#f5a623]/5 px-4 py-2.5 text-sm text-[#b45309]">
            {toast}
          </div>
        )}

        {cooldownLeft > 0 && (
          <Alert type="warning" message={`冷静期生效中 · 剩余 ${Math.ceil(cooldownLeft / 60000)} 分钟。理性参与，虚拟积分仅供娱乐。`} />
        )}

        <div className="flex flex-col gap-5 lg:flex-row">
          {/* ========== 左侧：绿色账户卡片 + 菜单 ========== */}
          <div className="w-full shrink-0 lg:w-64">
            {/* 绿色账户卡片 */}
            <div className="rounded-lg bg-[#00a650] p-5 text-white shadow-md">
              <div className="text-[10px] font-medium text-white/60 uppercase tracking-wider">个人中心 · 首页</div>
              <div className="mt-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur-sm">
                  {me.nickname?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
              <div className="mt-3 text-center text-sm font-medium">hello {me.nickname}</div>
              <div className="mt-1 text-center">
                <span className="text-xl font-bold num">¥{fmtInt(me.balance ?? 0)}</span>
                <span className="ml-1 text-[10px] text-white/60">EEC</span>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Link
                  href="/wallet"
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-[#00a650] shadow-sm transition-transform hover:scale-105"
                >
                  充值
                </Link>
                <Link
                  href="/wallet?tab=withdraw"
                  className="rounded-full border border-white/40 px-4 py-1.5 text-xs font-medium text-white transition-transform hover:scale-105"
                >
                  提现
                </Link>
              </div>
            </div>

            {/* 菜单 */}
            <nav className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              {MENU.map((item, idx) => (
                <button
                  key={item.key}
                  onClick={() => setMenu(item.key as any)}
                  className={clsx(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors border-l-2",
                    menu === item.key
                      ? "bg-[#00a650]/10 text-[#00a650] border-[#00a650] font-medium"
                      : "text-gray-600 border-transparent hover:bg-gray-50",
                    idx > 0 && "border-t border-gray-100",
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            {/* 签到按钮 */}
            <button
              onClick={doSignin}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#00a650] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#008153] transition-colors"
            >
              📅 每日签到
            </button>
          </div>

          {/* ========== 右侧：彩色功能卡片 + 内容区 ========== */}
          <div className="min-w-0 flex-1 space-y-4">
            {/* 彩色功能卡片 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ColorCard title="账户储蓄" subtitle="定期存储获收益" action="立即储蓄" color="pink" icon="🏦" />
              <ColorCard title="通知中心" subtitle="系统公告与消息" action="查看更多" color="orange" icon="🔔" />
              <ColorCard title="在线客服" subtitle="7x24小时服务" action="开启对话" color="blue" icon="💬" />
            </div>

            {/* 内容区 — 根据菜单切换 */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {/* 账户信息 */}
              {menu === "info" && (
                <div className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-gray-800">账户信息</h2>

                  {/* 核心指标 */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      { label: "可用积分", value: fmtInt(me.balance ?? 0), color: "text-[#f5a623]" },
                      { label: "累计投资份额", value: fmtInt(s.volume), color: "text-gray-800" },
                      { label: "净盈亏", value: fmtSigned(s.profit), color: (s.profit ?? 0) >= 0 ? "text-[#00a650]" : "text-[#ff4d4f]" },
                      { label: "结算胜率", value: fmtPct(s.winRate), color: "text-[#00a650]" },
                      { label: "参与周期", value: fmtInt(s.rounds), color: "text-gray-800" },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="text-[11px] text-gray-500">{m.label}</div>
                        <div className={clsx("num mt-1 text-lg font-bold", m.color)}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 战绩统计 */}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-gray-100 p-3">
                      <div className="text-[11px] text-gray-500">结算笔数</div>
                      <div className="num mt-1 text-base font-bold text-gray-800">{fmtInt(s.settledBets)}</div>
                    </div>
                    <div className="rounded-lg border border-gray-100 p-3">
                      <div className="text-[11px] text-gray-500">盈利周期</div>
                      <div className="num mt-1 text-base font-bold text-[#00a650]">{fmtInt(s.wonRounds)}</div>
                    </div>
                    <div className="rounded-lg border border-gray-100 p-3">
                      <div className="text-[11px] text-gray-500">ROI</div>
                      <div className={clsx("num mt-1 text-base font-bold", (s.roi ?? 0) >= 0 ? "text-[#00a650]" : "text-[#ff4d4f]")}>{fmtPct(s.roi)}</div>
                    </div>
                    <div className="rounded-lg border border-gray-100 p-3">
                      <div className="text-[11px] text-gray-500">最佳单周期</div>
                      <div className="num mt-1 text-base font-bold text-[#f5a623]">{fmtSigned(s.bestRound)}</div>
                    </div>
                  </div>

                  {/* 成就墙 */}
                  <h3 className="mb-3 mt-6 text-sm font-semibold text-gray-700">成就墙</h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {Object.entries(ACH_NAMES).map(([code, meta]) => {
                      const unlocked = (achievements.data?.data ?? []).some((a: { achievementCode: string }) => a.achievementCode === code);
                      return (
                        <div
                          key={code}
                          className={clsx(
                            "rounded-lg p-3 text-center transition-all",
                            unlocked ? "border border-[#f5a623]/30 bg-[#f5a623]/5" : "border border-gray-200 opacity-45",
                          )}
                        >
                          <div className={clsx("text-2xl", unlocked ? "text-[#f5a623]" : "text-gray-400")}>{meta.icon}</div>
                          <div className="mt-1.5 text-[11px] font-medium text-gray-700">{meta.name}</div>
                          <div className="mt-0.5 text-[9px] text-gray-400">{unlocked ? "已解锁" : "未解锁"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 账户管理 */}
              {menu === "manage" && (
                <div className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-gray-800">账户管理</h2>

                  {/* 用户头像和基本信息 */}
                  <div className="mb-6 flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-600 text-xl font-bold text-white">
                      {me.nickname?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="mt-2 text-base font-semibold text-gray-800">{me.nickname}</div>
                    <div className="mt-1 flex items-center gap-6 text-xs text-gray-500">
                      <span>股东昵称: <span className="font-medium text-gray-700">{me.username}</span></span>
                      <span>手机号: <span className="font-medium text-gray-700">130****7177</span></span>
                    </div>
                  </div>

                  {/* 管理列表 */}
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {[
                      { icon: "🔒", title: "登录密码", desc: "6-16位字符", action: "修改登录密码" },
                      { icon: "💳", title: "绑定银行卡", desc: "最多可绑定5张银行卡", action: "绑定银行卡" },
                      { icon: "🛡️", title: "提款密码", desc: "6-16位字符", action: "修改提款密码" },
                      { icon: "📋", title: "实名认证", desc: "提升账户安全等级", action: "进行实名认证" },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center gap-3 py-3.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-lg">{item.icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800">{item.title}</div>
                          <div className="text-[11px] text-gray-400">{item.desc}</div>
                        </div>
                        <button className="text-xs text-[#00a650] hover:text-[#008153] transition-colors">{item.action}</button>
                      </div>
                    ))}
                  </div>

                  {/* 参与保护 */}
                  <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">参与保护</h3>
                    <ul className="space-y-1 text-[11px] leading-relaxed text-gray-500">
                      <li>· 单周期投资份额上限、每日投资份额上限由平台统一配置，超限将拒绝建立投资份额。</li>
                      <li>· 每 30 分钟弹出一次参与时长提醒，可随时开启 30 分钟冷静期。</li>
                      <li>· 碳积分（EEC）为虚拟积分，不可兑换、不可提现、不可转让、无真钱价值。</li>
                    </ul>
                    <button
                      onClick={() => {
                        const until = Date.now() + 30 * 60 * 1000;
                        localStorage.setItem("cnx_cooldown_until", String(until));
                        setCooldownUntil(until);
                        setToast("冷静期已开启（30 分钟）");
                        setTimeout(() => setToast(null), 3000);
                      }}
                      className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      开启30分钟冷静期
                    </button>
                  </div>
                </div>
              )}

              {/* 资金管理 */}
              {menu === "funds" && (
                <div className="p-5">
                  <h2 className="mb-4 text-base font-semibold text-gray-800">资金管理</h2>

                  {/* 资金概览 */}
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
                      <div className="text-[11px] text-gray-500">可用余额</div>
                      <div className="num mt-1 text-lg font-bold text-[#f5a623]">{fmtInt(me.balance ?? 0)}</div>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
                      <div className="text-[11px] text-gray-500">累计收入</div>
                      <div className="num mt-1 text-lg font-bold text-[#00a650]">{fmtInt(s.totalIn ?? 0)}</div>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-center">
                      <div className="text-[11px] text-gray-500">累计支出</div>
                      <div className="num mt-1 text-lg font-bold text-[#ff4d4f]">{fmtInt(s.totalOut ?? 0)}</div>
                    </div>
                  </div>

                  {/* 生态任务 */}
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">生态任务</h3>
                  <div className="space-y-2">
                    {(tasks.data?.data ?? []).map((t: { code: string; name: string; progress: number; target: number; reward: number; claimed: boolean }) => (
                      <div key={t.code} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800">{t.name}</div>
                          <div className="mt-1.5">
                            <Progress percent={(t.progress / t.target) * 100} size="sm" showText={false} />
                          </div>
                          <div className="mt-1 text-[10px] text-gray-400 num">{t.progress}/{t.target}</div>
                        </div>
                        <div className="text-right">
                          <div className="num text-sm font-bold text-[#f5a623]">+{fmtInt(t.reward)}</div>
                          <button
                            disabled={t.claimed || t.progress < t.target}
                            onClick={() => claim(t.code)}
                            className={clsx(
                              "mt-1 rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                              t.claimed
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : t.progress >= t.target
                                  ? "bg-[#00a650] text-white hover:bg-[#008153]"
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
                            )}
                          >
                            {t.claimed ? "已领" : "领取"}
                          </button>
                        </div>
                      </div>
                    ))}
                    {!(tasks.data?.data ?? []).length && <Empty text="暂无任务" />}
                  </div>
                </div>
              )}

              {/* 交易记录 */}
              {menu === "trades" && (
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-800">交易记录</h2>
                    <div className="flex gap-1">
                      {[{ key: "bets", label: "投资份额记录" }, { key: "ledger", label: "流水记录" }, { key: "curve", label: "收益曲线" }].map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setSubTab(t.key as any)}
                          className={clsx(
                            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                            subTab === t.key ? "bg-[#00a650]/10 text-[#00a650]" : "text-gray-500 hover:text-gray-800",
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {subTab === "curve" && (
                    <div>
                      <div className="mb-3 flex gap-1">
                        {[{ d: 7, l: "7D" }, { d: 30, l: "30D" }, { d: 90, l: "90D" }].map((o) => (
                          <button
                            key={o.d}
                            onClick={() => setDays(o.d)}
                            className={clsx(
                              "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                              days === o.d ? "bg-[#00a650] text-white" : "text-gray-500 hover:bg-gray-100",
                            )}
                          >
                            {o.l}
                          </button>
                        ))}
                      </div>
                      {curveOption ? <EChart option={curveOption} height={280} /> : <Empty text="暂无曲线数据" />}
                    </div>
                  )}

                  {subTab === "bets" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-500">周期</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-500">方向</th>
                            <th className="px-3 py-2.5 text-right font-semibold text-gray-500">数量</th>
                            <th className="px-3 py-2.5 text-right font-semibold text-gray-500">清算所得</th>
                            <th className="px-3 py-2.5 text-left font-semibold text-gray-500">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(bets.data?.data ?? []).map((b: { id: number; roundCode: string; side: string; amount: number; payout: number; status: string }) => (
                            <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="num px-3 py-2.5 text-gray-800">{b.roundCode}</td>
                              <td className={clsx("px-3 py-2.5 font-medium", b.side === "up" ? "text-[#00a650]" : "text-[#ff4d4f]")}>
                                {b.side === "up" ? "▲ 看多" : "▼ 看空"}
                              </td>
                              <td className="num px-3 py-2.5 text-right text-gray-600">{fmtInt(b.amount)}</td>
                              <td className="num px-3 py-2.5 text-right text-[#f5a623]">{fmtInt(b.payout)}</td>
                              <td className="px-3 py-2.5">
                                <Tag color={b.status === "settled" ? "green" : b.status === "pending" ? "orange" : "gray"}>
                                  {b.status === "settled" ? "已结算" : b.status === "pending" ? "待清算" : b.status}
                                </Tag>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!(bets.data?.data ?? []).length && <Empty text="暂无投资份额记录" />}
                    </div>
                  )}

                  {subTab === "ledger" && (
                    <div className="space-y-1">
                      {(ledger.data?.data ?? []).map((l: { id: number; amount: number; type: string; remark: string; balanceAfter: number; createdAt: string }) => (
                        <div key={l.id} className="flex items-center gap-3 border-b border-gray-100 py-2.5 text-xs hover:bg-gray-50 px-1 rounded">
                          <span className="num text-gray-400 shrink-0 w-28">{new Date(l.createdAt).toISOString().slice(5, 16).replace("T", " ")}</span>
                          <Tag color="blue">{LEDGER_LABEL[l.type] ?? l.type}</Tag>
                          <span className={clsx("num w-24 text-right shrink-0 font-medium", l.amount >= 0 ? "text-[#00a650]" : "text-[#ff4d4f]")}>{fmtSigned(l.amount)}</span>
                          <span className="num w-24 text-right text-gray-400 shrink-0">余 {fmtInt(l.balanceAfter)}</span>
                          <span className="min-w-0 flex-1 truncate text-gray-500">{l.remark}</span>
                        </div>
                      ))}
                      {!(ledger.data?.data ?? []).length && <Empty text="暂无流水" />}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
