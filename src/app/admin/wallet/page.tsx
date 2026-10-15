"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";

export const dynamic = "force-dynamic";

type Tab = "deposits" | "withdrawals";

interface Deposit {
  id: number;
  userId: number;
  amount: string;
  status: string;
  paymentMethod: string;
  remark: string;
  createdAt: string;
  username?: string;
  nickname?: string;
}

interface Withdrawal {
  id: number;
  userId: number;
  amount: string;
  fee: string;
  actualAmount: string;
  status: string;
  withdrawAccount: string;
  withdrawName: string;
  remark: string;
  createdAt: string;
  username?: string;
  nickname?: string;
}

export default function AdminWalletPage() {
  const [tab, setTab] = useState<Tab>("deposits");
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = async () => {
    setLoading(true);
    const [ovRes, depRes, withRes] = await Promise.all([
      fetch("/api/admin/wallet/overview", { headers }),
      fetch("/api/admin/wallet/deposits", { headers }),
      fetch("/api/admin/wallet/withdrawals", { headers }),
    ]);
    const [ov, dep, withData] = await Promise.all([ovRes.json(), depRes.json(), withRes.json()]);
    if (ov.ok) setOverview(ov.data);
    if (dep.ok) setDeposits(dep.data.list || []);
    if (withData.ok) setWithdrawals(withData.data.list || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (action: string, id: number, remark?: string) => {
    await fetch(`/api/admin/wallet/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ id, remark }),
    });
    fetchData();
  };

  if (loading) return <div className="p-6 text-gray-500">加载中...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">资金审核</h1>

      {overview && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <div className="text-xs text-gray-500">充值总额</div>
            <div className="mt-1 text-lg font-bold text-green-600">¥{overview.deposits.totalAmount}</div>
            <div className="text-xs text-gray-400">{overview.deposits.totalCount} 笔</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">待审核充值</div>
            <div className="mt-1 text-lg font-bold text-yellow-600">{overview.deposits.pendingCount}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">提现总额</div>
            <div className="mt-1 text-lg font-bold text-red-600">¥{overview.withdrawals.totalAmount}</div>
            <div className="text-xs text-gray-400">{overview.withdrawals.totalCount} 笔</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">待审核提现</div>
            <div className="mt-1 text-lg font-bold text-yellow-600">{overview.withdrawals.pendingCount}</div>
          </Card>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "deposits" ? "primary" : "secondary"} onClick={() => setTab("deposits")}>
          充值记录
        </Button>
        <Button size="sm" variant={tab === "withdrawals" ? "primary" : "secondary"} onClick={() => setTab("withdrawals")}>
          提现记录
        </Button>
      </div>

      {tab === "deposits" && (
        <Card title={`充值记录 (${deposits.length})`} status="live">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2">用户</th>
                  <th className="py-2">金额</th>
                  <th className="py-2">方式</th>
                  <th className="py-2">状态</th>
                  <th className="py-2">凭证</th>
                  <th className="py-2">时间</th>
                  <th className="py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="py-2">{d.username || d.userId}</td>
                    <td className="py-2 font-medium">¥{d.amount}</td>
                    <td className="py-2 text-xs text-gray-500">{d.paymentMethod}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          d.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : d.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2 max-w-[200px] truncate text-xs text-gray-500">{d.remark}</td>
                    <td className="py-2 text-xs text-gray-500">{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="py-2">
                      {d.status === "pending" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAction("approve-deposit", d.id)}
                            className="rounded bg-green-50 px-2 py-1 text-xs text-green-600 hover:bg-green-100"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => handleAction("reject-deposit", d.id)}
                            className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "withdrawals" && (
        <Card title={`提现记录 (${withdrawals.length})`} status="live">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2">用户</th>
                  <th className="py-2">金额</th>
                  <th className="py-2">手续费</th>
                  <th className="py-2">实到</th>
                  <th className="py-2">收款账户</th>
                  <th className="py-2">状态</th>
                  <th className="py-2">时间</th>
                  <th className="py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-gray-100">
                    <td className="py-2">{w.username || w.userId}</td>
                    <td className="py-2 font-medium">¥{w.amount}</td>
                    <td className="py-2 text-gray-500">¥{w.fee}</td>
                    <td className="py-2 text-green-600">¥{w.actualAmount}</td>
                    <td className="py-2 text-xs text-gray-500">{w.withdrawName} / {w.withdrawAccount}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          w.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : w.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-gray-500">{new Date(w.createdAt).toLocaleString()}</td>
                    <td className="py-2">
                      {w.status === "pending" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAction("approve-withdraw", w.id)}
                            className="rounded bg-green-50 px-2 py-1 text-xs text-green-600 hover:bg-green-100"
                          >
                            打款
                          </button>
                          <button
                            onClick={() => handleAction("reject-withdraw", w.id)}
                            className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
