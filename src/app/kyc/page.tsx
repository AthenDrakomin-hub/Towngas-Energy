"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";

export default function KycPage() {
  const [realName, setRealName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/kyc")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setRealName(json.data.realName || "");
          setIdCard(json.data.idCard || "");
          setStatus(json.data.kycStatus || "pending");
        }
      });
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await fetch("/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ realName, idCard }),
    });
    const json = await res.json();
    if (json.ok) {
      alert("实名认证成功！");
      setStatus("verified");
    } else {
      alert(json.message || "提交失败");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold text-gray-800">实名认证</h1>

      <Card>
        {status === "verified" ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <div className="text-4xl">✅</div>
              <div className="mt-2 font-medium text-green-700">已完成实名认证</div>
              <div className="mt-1 text-sm text-gray-500">姓名：{realName}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-600">
              为保障您的账户资金安全，提现前请先完成实名认证。
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">真实姓名</label>
              <Input
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="请输入身份证上的姓名"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">身份证号码</label>
              <Input
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
                placeholder="请输入15位或18位身份证号"
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "提交中..." : "提交认证"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
