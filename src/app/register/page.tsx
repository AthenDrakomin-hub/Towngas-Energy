"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();

      if (json.ok) {
        alert("注册成功！请登录");
        router.push("/login");
      } else {
        setError(json.message || "注册失败");
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800">港华能源</h1>
          <p className="mt-1 text-sm text-gray-500">创建新账户</p>
        </div>

        <Card>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">用户名</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-20位字母/数字/下划线"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">确认密码</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
              />
            </div>

            {error && (
              <div className="rounded bg-red-50 p-2 text-xs text-red-600">{error}</div>
            )}

            <Button
              variant="primary"
              className="w-full"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "注册中..." : "注册"}
            </Button>

            <div className="text-center text-xs text-gray-500">
              已有账户？{" "}
              <a href="/login" className="text-primary hover:underline">
                立即登录
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
