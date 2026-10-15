"use client";

import { useState } from "react";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { fmtInt } from "@/lib/format";

type Tab = "deposit" | "withdraw" | "history";

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>("deposit");

  // 充值方式（后台可配置，这里先写默认值）
  const depositMethods = [
    {
      id: "usdt_trc20",
      name: "USDT（TRC20）",
      icon: "🪙",
      desc: "Tron 网络，到账快，手续费低",
      minAmount: 10,
    },
    {
      id: "bank_transfer",
      name: "银行电汇",
      icon: "🏦",
      desc: "中银香港 / 内地中行，跨境汇款",
      minAmount: 100,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">我的钱包</h1>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "deposit", label: "充值" },
          { key: "withdraw", label: "提现" },
          { key: "history", label: "记录" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 充值页面 - 展示充值方式 */}
      {tab === "deposit" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            <div className="font-medium">选择充值方式</div>
            <div className="mt-1 text-xs text-blue-600">
              选择下方充值方式后，请联系客服获取收款账户信息，转账完成后客服确认到账。
            </div>
          </div>

          {depositMethods.map((method) => (
            <Card key={method.id}>
              <div className="flex items-center gap-4">
                <div className="text-3xl">{method.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{method.name}</div>
                  <div className="mt-1 text-xs text-gray-500">{method.desc}</div>
                  <div className="mt-1 text-xs text-gray-400">最低充值 ¥{method.minAmount}</div>
                </div>
                <Button size="sm" variant="primary" onClick={() => window.open("https://kefu.lexiangim.com", "_blank")}>
                  联系客服充值
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 提现页面 - 申请提现 */}
      {tab === "withdraw" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            <div className="font-medium">提现说明</div>
            <div className="mt-1 text-xs text-amber-600">
              提现申请提交后，管理员将在 1-24 小时内审核处理，审核通过后人工打款到您指定的账户。
            </div>
          </div>

          <Card title="申请提现">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">提现金额（元）</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  placeholder="最低提现 ¥50"
                />
                <p className="mt-1 text-xs text-gray-400">手续费 5%，最低提现 ¥50</p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">提现账户信息</label>
                <textarea
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="请输入您的 USDT 地址或银行账户信息"
                />
              </div>

              <Button variant="primary" className="w-full">
                提交提现申请
              </Button>

              <div className="text-center text-xs text-gray-400">
                遇到问题？<a href="#" className="text-primary hover:underline">联系客服</a>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 记录页面 - 占位 */}
      {tab === "history" && (
        <Card>
          <p className="py-8 text-center text-gray-400">暂无交易记录</p>
        </Card>
      )}
    </div>
  );
}
