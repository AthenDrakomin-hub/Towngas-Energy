"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";
import { fmtInt } from "@/lib/format";

export const dynamic = "force-dynamic";

/** 客户端安全获取认证 headers */
function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Tab = "deposit" | "withdraw" | "history";

const DEPOSIT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "审核中", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "已到账", color: "bg-green-100 text-green-700" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-700" },
};

const WITHDRAW_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "审核中", color: "bg-yellow-100 text-yellow-700" },
  paid: { label: "已打款", color: "bg-green-100 text-green-700" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-700" },
};

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>("deposit");
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState(100);
  const [depositProof, setDepositProof] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [withdrawName, setWithdrawName] = useState("");
  const [message, setMessage] = useState("");

  const historyQuery = useQuery({
    queryKey: ["wallet-history"],
    queryFn: async () => (await fetch("/api/wallet/history", { headers: getAuthHeaders() })).json(),
  });

  const deposits = historyQuery.data?.data?.deposits ?? [];
  const withdrawals = historyQuery.data?.data?.withdrawals ?? [];

  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ amount: depositAmount, paymentProof: depositProof }),
      });
      return res.json();
    },
    onSuccess: (json) => {
      if (json.ok) {
        setMessage("✅ 充值申请已提交，等待审核");
        queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
        setTab("history");
      } else {
        setMessage(json.message || "提交失败");
      }
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ amount: withdrawAmount, withdrawAccount, withdrawName }),
      });
      return res.json();
    },
    onSuccess: (json) => {
      if (json.ok) {
        setMessage("✅ " + json.data.message);
        queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
        setTab("history");
      } else {
        setMessage(json.message || "提交失败");
      }
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">我的钱包</h1>

      {message && (
        <div className="rounded-lg bg-gray-50 px-4 py-2 text-sm">{message}</div>
      )}

      <div className="flex gap-2">
        {(["deposit", "withdraw", "history"] as Tab[]).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "primary" : "secondary"}
            onClick={() => setTab(t)}
          >
            {t === "deposit" ? "充值" : t === "withdraw" ? "提现" : "记录"}
          </Button>
        ))}
      </div>

      {tab === "deposit" && (
        <Card title="手动充值" status="live">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">充值金额</label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">转账凭证号</label>
              <Input
                value={depositProof}
                onChange={(e) => setDepositProof(e.target.value)}
                placeholder="转账后填写凭证号"
              />
            </div>
            <Button onClick={() => depositMutation.mutate()} disabled={depositMutation.isPending}>
              {depositMutation.isPending ? "提交中..." : "提交充值申请"}
            </Button>
          </div>
        </Card>
      )}

      {tab === "withdraw" && (
        <Card title="申请提现" status="live">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">提现金额（最低50元，手续费5%）</label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">收款账户</label>
              <Input
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                placeholder="银行卡号/USDT地址"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">收款人姓名</label>
              <Input
                value={withdrawName}
                onChange={(e) => setWithdrawName(e.target.value)}
                placeholder="收款人姓名"
              />
            </div>
            <Button onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending}>
              {withdrawMutation.isPending ? "提交中..." : "提交提现申请"}
            </Button>
          </div>
        </Card>
      )}

      {tab === "history" && (
        <Card title="交易记录" status="live">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">充值记录</h3>
            {deposits.length === 0 && <p className="text-sm text-gray-400">暂无充值记录</p>}
            {deposits.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between border-b border-gray-50 py-2">
                <div>
                  <div className="text-sm font-medium">+¥{fmtInt(d.amount)}</div>
                  <div className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString()}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${DEPOSIT_STATUS[d.status]?.color || "bg-gray-100"}`}>
                  {DEPOSIT_STATUS[d.status]?.label || d.status}
                </span>
              </div>
            ))}
            <h3 className="pt-4 text-sm font-semibold text-gray-700">提现记录</h3>
            {withdrawals.length === 0 && <p className="text-sm text-gray-400">暂无提现记录</p>}
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between border-b border-gray-50 py-2">
                <div>
                  <div className="text-sm font-medium text-red-600">-¥{fmtInt(w.amount)}</div>
                  <div className="text-xs text-gray-400">{new Date(w.createdAt).toLocaleString()}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${WITHDRAW_STATUS[w.status]?.color || "bg-gray-100"}`}>
                  {WITHDRAW_STATUS[w.status]?.label || w.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
