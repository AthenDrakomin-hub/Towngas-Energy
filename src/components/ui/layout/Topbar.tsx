"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, Me } from "@/components/Shell";
import { fmtInt } from "@/lib/format";
import { PLATFORM, FOUR_PLATFORMS } from "@/lib/constants";

export function Topbar() {
  const { data } = useSession();
  const me: Me | null = data?.data ?? null;
  const [clock, setClock] = useState("--:--:--");
  const [latency, setLatency] = useState(2.3);

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
      setLatency(Number((1.4 + Math.random() * 2.6).toFixed(1)));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-line glass-strong">
      <div className="flex h-full items-center gap-4 px-6">
        {/* 移动端Logo */}
        <Link href="/" className="flex md:hidden items-center gap-2">
          <img src="/logo/towngas-logo.png" alt="港华智慧能源" className="towngas-logo h-6 w-auto" />
        </Link>

        {/* 系统状态（桌面端） */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] text-text-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
            <span className="text-text-2">{PLATFORM.name}</span>
            <span className="text-text-4">v{PLATFORM.version}</span>
          </span>
          <span className="text-line">|</span>
          <span>
            节点 <span className="num text-text-2">{PLATFORM.node}</span>
          </span>
          <span>
            延迟 <span className="num text-success">{latency.toFixed(1)}ms</span>
          </span>
          <span className="text-line">|</span>
          {FOUR_PLATFORMS.slice(0, 2).map((p) => (
            <span key={p.key} className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-success" />
              {p.name}
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* 时钟 */}
          <span className="hidden sm:block num text-xs text-text-3">{clock}</span>

          {me ? (
            <>
              {/* 余额 */}
              <div className="flex items-center gap-1.5 rounded-lg bg-bg-3 px-3 py-1.5">
                <span className="text-[10px] text-text-3">余额</span>
                <span className="num text-sm font-bold text-warning">{fmtInt(me.balance ?? 0)}</span>
              </div>

              {/* 用户头像 */}
              <Link href="/me" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                  {me.nickname?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:block text-sm font-medium text-text-1">{me.nickname}</span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
