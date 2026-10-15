import Link from "next/link";
import { ClientTopbar, BottomNav } from "@/components/ClientNav";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <ClientTopbar />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-[#00a650] to-[#008153] p-8 text-white">
          <h1 className="text-3xl font-bold">港华智慧能源投资平台</h1>
          <p className="mt-2 text-green-100">Carbon Nebula — 绿色能源 · 智慧投资</p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/wallet"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#00a650] hover:bg-green-50"
            >
              进入钱包
            </Link>
            <Link
              href="/signal"
              className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              投资中心
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-2xl">📊</div>
            <h3 className="mt-2 font-semibold text-gray-800">实时行情</h3>
            <p className="mt-1 text-sm text-gray-500">碳配额、绿证、能源指标实时追踪</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-2xl">🔒</div>
            <h3 className="mt-2 font-semibold text-gray-800">资金安全</h3>
            <p className="mt-1 text-sm text-gray-500">银行级加密，多重风控审核保障</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-2xl">⚡</div>
            <h3 className="mt-2 font-semibold text-gray-800">快速到账</h3>
            <p className="mt-1 text-sm text-gray-500">充值1-2小时审核，提现1-24小时到账</p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
