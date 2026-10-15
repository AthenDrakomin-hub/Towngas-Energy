import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PLATFORM } from "@/lib/constants";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: `${PLATFORM.fullName}`,
  description: `${PLATFORM.fullName} · 港华绿电 / 港华碳资产 / 港华数能 / 港华综能 四位一体 · 虚拟积分，仅供娱乐`,
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] border-t border-gray-200 bg-white/80 py-1 text-center text-[10px] tracking-[0.24em] text-mute backdrop-blur">
          {PLATFORM.disclaimer}
        </div>
      </body>
    </html>
  );
}
