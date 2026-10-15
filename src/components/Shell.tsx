"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav, ClientTopbar } from "./ui/layout/ClientNav";

export type Me = { id: number; nickname: string; role: string; balance?: number; username: string };

export function useSession() {
  return useQuery<{ ok: boolean; data: Me | null }>({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (res.status === 401) return { ok: true, data: null };
      return res.json();
    },
    staleTime: 15000,
  });
}

/**
 * 客户端布局 — 移动优先交易App风格
 * - 移动端：顶部状态栏 + 底部Tab导航
 * - 桌面端：顶部导航栏 + 居中内容区（最大宽度限制）
 */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-1">
      <ClientTopbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 md:pb-8 lg:px-8 animate-reveal">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(() => Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return useMemo(() => now, [now]);
}
