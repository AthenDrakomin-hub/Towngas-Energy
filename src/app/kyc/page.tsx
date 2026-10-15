"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";

export const dynamic = "force-dynamic";

export default function KycPage() {
  const [realName, setRealName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [kycStatus, setKycStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetch("/api/kyc", { headers })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setRealName(json.data.realName);
          setIdCard(json.data.idCard);
          setKycStatus(json.data.kycStatus);
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage("");
    const res = await fetch("/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ realName, idCard }),
    });
    const json = await res.json();
    if (json.ok) {
      setKycStatus("verified");
      setMessage("✅ 实名认证成功");
    } else {
      setMessage(json.message || "提交失败");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-6 text-gray-500">加载中...</div>;

  return (
    <div className="mx-auto max-w-md p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">实名认证</h1>

      {kycStatus === "verified" && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          ✅ 您已完成实名认证
        </div>
      )}

      {message && <div className="rounded-lg bg-gray-50 px-4 py-2 text-sm">{message}</div>}

      <Card title="身份信息" status="live">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">真实姓名</label>
            <Input
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              disabled={kycStatus === "verified"}
              placeholder="请输入真实姓名"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">身份证号码</label>
            <Input
              value={idCard}
              onChange={(e) => setIdCard(e.target.value)}
              disabled={kycStatus === "verified"}
              placeholder="请输入15或18位身份证号"
            />
          </div>
          {kycStatus !== "verified" && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "提交中..." : "提交认证"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
