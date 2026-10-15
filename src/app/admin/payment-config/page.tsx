"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";

interface PaymentMethod {
  id: number;
  name: string;
  icon: string;
  desc: string;
  minAmount: number;
  isActive: boolean;
}

export default function AdminPaymentConfigPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [minAmount, setMinAmount] = useState(10);

  useEffect(() => {
    fetch("/api/admin/payment-config")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setMethods(json.data.methods || []);
        }
        setLoading(false);
      });
  }, []);

  const addMethod = async () => {
    if (!name) return;
    await fetch("/api/admin/payment-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, desc, minAmount }),
    });
    setName("");
    setDesc("");
    setMinAmount(10);
    // 重新加载
    fetch("/api/admin/payment-config")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setMethods(json.data.methods || []);
        }
      });
  };

  if (loading) {
    return <div className="p-6 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">充值方式配置</h1>

      <Card title="添加充值方式">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">方式名称</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：USDT (TRC20)" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">说明</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="如：Tron 网络，到账快" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">最低充值（元）</label>
            <Input type="number" value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-4">
          <Button size="sm" variant="primary" onClick={addMethod}>添加</Button>
        </div>
      </Card>

      <Card title={`当前充值方式（${methods.length}个）`}>
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div>
                <div className="font-medium text-gray-800">{m.icon} {m.name}</div>
                <div className="mt-1 text-xs text-gray-500">{m.desc} · 最低 ¥{m.minAmount}</div>
              </div>
              <button className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">删除</button>
            </div>
          ))}
          {methods.length === 0 && (
            <p className="py-4 text-center text-gray-400">暂无充值方式</p>
          )}
        </div>
      </Card>
    </div>
  );
}
