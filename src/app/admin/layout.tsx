"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import clsx from "clsx";
import { useSession } from "@/components/Shell";
import { ROLES } from "@/lib/constants";

const NAV = [
  { href: "/admin", label: "数据看板", scope: "dashboard", icon: "📊", exact: true },
  { href: "/admin/notifications", label: "通知中心", scope: "dashboard", icon: "🔔" },
  { href: "/admin/rounds", label: "轮次控制台", scope: "rounds", icon: "🎯" },
  { href: "/admin/users", label: "用户控制台", scope: "users", icon: "👥" },
  { href: "/admin/wallet", label: "资金管理", scope: "finance", icon: "💳" },
  { href: "/admin/payment-config", label: "收款配置", scope: "finance", icon: "🏦" },
  { href: "/admin/points", label: "积分控制台", scope: "points", icon: "💰" },
  { href: "/admin/results", label: "结果控制台", scope: "results", icon: "📋" },
  { href: "/admin/content", label: "内容控制台", scope: "content", icon: "📝" },
  { href: "/admin/content-config", label: "文案配置", scope: "content", icon: "✏️" },
  { href: "/admin/logs", label: "管理日志", scope: "logs", icon: "📜" },
  { href: "/admin/errors", label: "错误日志", scope: "logs", icon: "🐛" },
];

const ADMIN_ROLES = ["admin", "super", "ops", "finance", "observer", "support"];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "数据看板",
  "/admin/rounds": "轮次控制台",
  "/admin/users": "用户控制台",
  "/admin/wallet": "资金管理",
  "/admin/points": "积分控制台",
  "/admin/results": "结果控制台",
  "/admin/content": "内容控制台",
  "/admin/content-config": "文案配置",
  "/admin/logs": "管理日志",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLoading } = useSession();
  const me = data?.data ?? null;
  const isLoggedIn = Boolean(me);
  const allowed = Boolean(me && ADMIN_ROLES.includes(me.role));

  // 未登录 → 重定向到登录页
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname));
    }
  }, [isLoading, isLoggedIn, pathname, router]);

  if (isLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        权限校验中...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="mb-2 text-lg font-semibold text-gray-800">管理端访问受限</h1>
          <p className="mb-6 text-sm leading-relaxed text-gray-500">
            当前账号不具备控制台权限。管理端包括轮次控制、用户控制、积分控制、结果控制与内容控制，请使用管理员账号接入。
          </p>
          <div className="space-y-2">
            <Link href="/login" className="flex w-full items-center justify-center rounded-md bg-[#00a650] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#008153] transition-colors">
              切换管理员账号
            </Link>
            <Link href="/" className="flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              返回客户端
            </Link>
          </div>
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-[10px] text-gray-400">Towngas Smart Energy · Admin Console</p>
          </div>
        </div>
      </div>
    );
  }

  const roleMeta = (ROLES as Record<string, { name: string; scope: readonly string[] }>)[me!.role];
  const scopes = roleMeta?.scope ?? [];
  const currentTitle = PAGE_TITLES[pathname] ?? "管理控制台";

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800" data-admin="true">
      {/* 左侧导航 — 浅色专业后台 */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        {/* 品牌区 */}
        <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#00a650] text-xs font-bold text-white">
            管
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-800">管理控制台</div>
            <div className="text-[9px] text-gray-400">Towngas Admin</div>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
              {me!.nickname?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-gray-700">{me!.nickname}</div>
              <div className="text-[9px] text-gray-400">{roleMeta?.name ?? me!.role}</div>
            </div>
          </div>
          <div className="mt-2 text-[9px] text-gray-400">
            权限: {scopes.includes("*") ? "全部" : scopes.join("/") || "只读"}
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "mx-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-[#00a650]/10 text-[#00a650] border-l-2 border-[#00a650]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 border-l-2 border-transparent",
                )}
              >
                <span className="text-xs">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="border-t border-gray-100 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            ← 返回客户端
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* 顶部栏 — 面包屑+操作 */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-2 text-xs">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600">首页</Link>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-700">{currentTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] text-gray-400 md:inline">CN-SZ-07 节点</span>
            <div className="h-2 w-2 rounded-full bg-green-500" title="系统运行中" />
          </div>
        </header>

        {/* 移动端导航 */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 md:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "shrink-0 rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active ? "bg-[#00a650]/10 text-[#00a650]" : "text-gray-400 hover:text-gray-600",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* 内容 */}
        <div className="min-w-0 flex-1 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
