"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const ADMIN_NAV = [
  { href: "/admin/users", label: "用户管理" },
  { href: "/admin/wallet", label: "资金审核" },
  { href: "/admin/payment-config", label: "收款配置" },
  { href: "/admin/notifications", label: "通知管理" },
  { href: "/admin/errors", label: "错误日志" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-56 border-r border-gray-200 bg-white md:block">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00a650] text-sm font-bold text-white">
            管
          </div>
          <span className="text-sm font-bold text-gray-800">管理后台</span>
        </div>
        <nav className="p-3 space-y-1">
          {ADMIN_NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-[#00a650]/10 text-[#00a650]" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="mt-4 block rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-100"
          >
            ← 返回前台
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
    </div>
  );
}
