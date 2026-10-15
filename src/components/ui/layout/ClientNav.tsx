"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSession, Me } from "@/components/Shell";
import { fmtInt } from "@/lib/format";
import { ThemeToggle } from "../ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "主页" },
  { href: "/signal", label: "投资中心" },
  { href: "/history", label: "交易记录" },
  { href: "/leaderboard", label: "节能减排榜" },
  { href: "/faq", label: "关于我们" },
];

const TABS = [
  {
    href: "/",
    label: "交易",
    icon: (active: boolean) => (
      <svg className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    href: "/signal",
    label: "行情",
    icon: (active: boolean) => (
      <svg className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "记录",
    icon: (active: boolean) => (
      <svg className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/leaderboard",
    label: "榜单",
    icon: (active: boolean) => (
      <svg className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    href: "/me",
    label: "我的",
    icon: (active: boolean) => (
      <svg className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

/**
 * 移动端底部Tab导航
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-line/80 bg-bg-1/95 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors",
                active ? "text-primary" : "text-text-4",
              )}
            >
              {tab.icon(active)}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * 客户端顶部栏 — 企业官网风格
 * - 左侧：Logo + 港华智慧能源/Towngas Smart Energy
 * - 中间：水平导航（主页/投资中心/交易记录/节能减排榜/关于我们）
 * - 右侧：客服 + 余额 + 头像 + 绿色登录按钮
 */
export function ClientTopbar() {
  const pathname = usePathname();
  const { data } = useSession();
  const me: Me | null = data?.data ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* 左侧：Logo + 品牌名 */}
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo/towngas-logo.png" alt="港华智慧能源" className="h-8 w-auto" />
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-gray-800 leading-tight">港华智慧能源</div>
            <div className="text-[9px] text-gray-400 tracking-wide">Towngas Smart Energy</div>
          </div>
        </Link>

        {/* 中间：水平导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "text-[#00a650]" : "text-gray-600 hover:text-gray-900",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 右侧：客服 + 主题切换 + 余额 + 头像 + 登录按钮 */}
        <div className="flex items-center gap-3">
          {/* 联系客服按钮 */}
          <a
            href="https://kefu.lexiangim.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            联系客服
          </a>

          <ThemeToggle />
          {me ? (
            <>
              <div className="hidden items-center gap-1.5 rounded-full bg-[#00a650]/10 px-3 py-1 sm:flex">
                <span className="text-xs font-bold text-[#00a650] num">{fmtInt(me.balance ?? 0)}</span>
                <span className="text-[10px] text-gray-500">积分</span>
              </div>
              <Link href="/me" className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                {me.nickname?.[0]?.toUpperCase() || "U"}
              </Link>
            </>
          ) : (
            <Link href="/login" className="rounded-md bg-[#00a650] px-5 py-2 text-sm font-medium text-white hover:bg-[#008153] transition-colors">
              登录系统
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
