"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";

export default function PaymentConfigPage() {
  const [config, setConfig] = useState({
    usdt_trc20_address: "",
    usdt_erc20_address: "",
    bank_name: "",
    bank_account: "",
    bank_account_name: "",
    swift_code: "",
    deposit_notice: "转账后请填写凭证号，管理员将在 1-2 小时内核对确认。",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/payment-config")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setConfig({ ...config, ...json.data });
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/payment-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage("✅ 保存成功");
      } else {
        setMessage(json.message || "保存失败");
      }
    } catch {
      setMessage("网络错误");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">收款配置</h1>

      {message && (
        <div className="rounded-lg bg-gray-50 px-4 py-2 text-sm">{message}</div>
      )}

      <Card title="USDT 加密货币收款" status="live">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">USDT TRC20 地址</label>
            <Input
              value={config.usdt_trc20_address}
              onChange={(e) => setConfig({ ...config, usdt_trc20_address: e.target.value })}
              placeholder="T 开头的 TRON 地址"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">USDT ERC20 地址</label>
            <Input
              value={config.usdt_erc20_address}
              onChange={(e) => setConfig({ ...config, usdt_erc20_address: e.target.value })}
              placeholder="0x 开头的以太坊地址"
            />
          </div>
        </div>
      </Card>

      <Card title="银行电汇收款" status="live">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">开户银行</label>
            <Input
              value={config.bank_name}
              onChange={(e) => setConfig({ ...config, bank_name: e.target.value })}
              placeholder="如：中银香港 / 中国银行"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">银行账号</label>
            <Input
              value={config.bank_account}
              onChange={(e) => setConfig({ ...config, bank_account: e.target.value })}
              placeholder="银行账户号码"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">账户名称</label>
            <Input
              value={config.bank_account_name}
              onChange={(e) => setConfig({ ...config, bank_account_name: e.target.value })}
              placeholder="账户开户名称"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">SWIFT 代码</label>
            <Input
              value={config.swift_code}
              onChange={(e) => setConfig({ ...config, swift_code: e.target.value })}
              placeholder="跨境汇款 SWIFT Code"
            />
          </div>
        </div>
      </Card>

      <Card title="充值说明文案" status="live">
        <div>
          <label className="mb-1 block text-xs text-gray-500">用户端充值页提示文案</label>
          <textarea
            className="w-full rounded-md border border-gray-200 p-2 text-sm"
            rows={3}
            value={config.deposit_notice}
            onChange={(e) => setConfig({ ...config, deposit_notice: e.target.value })}
          />
        </div>
      </Card>

      <Button variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? "保存中..." : "保存配置"}
      </Button>
    </div>
  );
}
