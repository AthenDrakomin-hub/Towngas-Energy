"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { fmtInt } from "@/lib/format";

type Tab = "overview" | "deposits" | "withdrawals";

export default function AdminWallet() {
  const [tab, setTab] = useState<Tab>("overview");
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ["admin-wallet-overview"],
    queryFn: async () => (await fetch("/api/admin/wallet/overview")).json(),
    refetchInterval: 15000,
  });

  const depositsQuery = useQuery({
    queryKey: ["admin-wallet-deposits"],
    queryFn: async () => (await fetch("/api/admin/wallet/deposits")).json(),
    refetchInterval: 10000,
  });

  const withdrawalsQuery = useQuery({
    queryKey: ["admin-wallet-withdrawals"],
    queryFn: async () => (await fetch("/api/admin/wallet/withdrawals")).json(),
    refetchInterval: 10000,
  });

  const approveDeposit = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch("/api/admin/wallet/approve-deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-overview"] });
    },
  });

  const rejectDeposit = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch("/api/admin/wallet/reject-deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, remark: "审核未通过" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-overview"] });
    },
  });

  const approveWithdraw = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch("/api/admin/wallet/approve-withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-overview"] });
    },
  });

  const rejectWithdraw = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch("/api/admin/wallet/reject-withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, remark: "审核未通过" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-overview"] });
    },
  });

  const overview = overviewQuery.data?.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">资金管理</h1>
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { key: "overview", label: "总览" },
            { key: "deposits", label: `充值审核 (${overview?.deposits?.pendingCount ?? 0})` },
            { key: "withdrawals", label: `提现审核 (${overview?.withdrawals?.pendingCount ?? 0})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 总览 */}
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card title="累计充值" status="live">
            <div className="text-2xl font-bold text-success">¥{fmtInt(overview?.deposits?.totalAmount ?? 0)}</div>
            <div className="mt-1 text-xs text-gray-400">{overview?.deposits?.totalCount ?? 0} 笔</div>
          </Card>
          <Card title="累计提现" status="live">
            <div className="text-2xl font-bold text-danger">¥{fmtInt(overview?.withdrawals?.totalAmount ?? 0)}</div>
            <div className="mt-1 text-xs text-gray-400">{overview?.withdrawals?.totalCount ?? 0} 笔</div>
          </Card>
          <Card title="提现手续费收入" status="live">
            <div className="text-2xl font-bold text-warning">¥{fmtInt(overview?.withdrawals?.totalFee ?? 0)}</div>
            <div className="mt-1 text-xs text-gray-400">5% 费率</div>
          </Card>
          <Card title="待处理" status="idle">
            <div className="text-2xl font-bold text-primary">
              {(overview?.deposits?.pendingCount ?? 0) + (overview?.withdrawals?.pendingCount ?? 0)}
            </div>
            <div className="mt-1 text-xs text-gray-400">充值 + 提现待审</div>
          </Card>
        </div>
      )}

      {/* 充值审核列表 */}
      {tab === "deposits" && (
        <Card title="充值审核" status="live" stamp={`${(depositsQuery.data?.data?.list ?? []).length} 条`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left">用户</th>
                  <th className="px-3 py-2 text-right">金额</th>
                  <th className="px-3 py-2 text-left">方式</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-left">时间</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {(depositsQuery.data?.data?.list ?? []).map((d: any) => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{d.nickname}</div>
                      <div className="text-[10px] text-gray-400">@{d.username}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-success">¥{fmtInt(d.amount)}</td>
                    <td className="px-3 py-2 text-gray-500">{d.paymentMethod}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          d.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : d.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {d.status === "approved" ? "已到账" : d.status === "rejected" ? "已拒绝" : "待审核"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {d.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="success" onClick={() => approveDeposit.mutate(d.id)}>
                            通过
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => rejectDeposit.mutate(d.id)}>
                            拒绝
                          </Button>
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

      {/* 提现审核列表 */}
      {tab === "withdrawals" && (
        <Card title="提现审核" status="live" stamp={`${(withdrawalsQuery.data?.data?.list ?? []).length} 条`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left">用户</th>
                  <th className="px-3 py-2 text-right">金额</th>
                  <th className="px-3 py-2 text-right">手续费</th>
                  <th className="px-3 py-2 text-left">收款账户</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-left">时间</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {(withdrawalsQuery.data?.data?.list ?? []).map((w: any) => (
                  <tr key={w.id} className="border-b border-gray-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{w.nickname}</div>
                      <div className="text-[10px] text-gray-400">@{w.username}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-danger">¥{fmtInt(w.amount)}</td>
                    <td className="px-3 py-2 text-right text-warning">¥{fmtInt(w.fee)}</td>
                    <td className="px-3 py-2 text-gray-500">
                      <div>{w.withdrawName}</div>
                      <div className="text-[10px] text-gray-400">{w.withdrawAccount}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          w.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : w.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : w.status === "approved"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {w.status === "paid"
                          ? "已打款"
                          : w.status === "rejected"
                            ? "已拒绝"
                            : w.status === "approved"
                              ? "已放行"
                              : "待审核"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{new Date(w.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {w.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="success" onClick={() => approveWithdraw.mutate(w.id)}>
                            通过
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => rejectWithdraw.mutate(w.id)}>
                            拒绝
                          </Button>
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
