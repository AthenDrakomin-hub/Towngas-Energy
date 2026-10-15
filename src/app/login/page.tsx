"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLATFORM, FOUR_PLATFORMS } from "@/lib/constants";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";
import { Badge } from "@/components/ui/display/Badge";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password, nickname }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.ok) {
      router.push("/");
      router.refresh();
    } else {
      setMsg(json.message ?? "接入失败");
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setMode("login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 左侧品牌区 — 企业官网风格 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/hero/annual-cover.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#008153]/90 via-[#00a650]/80 to-[#00a650]/90" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div>
            <img src="/logo/towngas-logo.png" alt="港华智慧能源" className="h-10 w-auto mb-8 brightness-0 invert" />
            <h1 className="text-4xl font-bold text-white leading-tight">
              致力发展成为
              <br />
              <span className="text-white/90">绿色智慧能源之领先企业</span>
            </h1>
            <p className="mt-4 text-white/70 text-sm leading-relaxed max-w-md">
              创造可持续的绿色能源世界。以真实生态数据源·ES-77 的能源生态指数（EEI）为演算标的，5分钟一个周期，读取末位奇偶与和值奇偶完成清算。
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold tracking-wider text-white/60 uppercase">四大平台能力</div>
            {FOUR_PLATFORMS.map((p) => (
              <div key={p.key} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
                <div>
                  <span className="text-sm font-medium text-white">{p.name}</span>
                  <span className="ml-2 text-[10px] text-white/60">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-white/50">{PLATFORM.disclaimer}</p>
        </div>
      </div>

      {/* 右侧登录区 — 浅色企业风格 */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* 移动端Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo/towngas-logo.png" alt="港华智慧能源" className="h-10 w-auto" />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            {/* Tab切换 */}
            <div className="flex gap-1 p-1 rounded-lg bg-gray-100 mb-6">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === m ? "bg-[#00a650] text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {m === "login" ? "节点接入" : "注册新节点"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <Input
                label="节点编号"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                autoComplete="username"
              />
              <Input
                label="访问密钥"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                autoComplete="current-password"
              />
              {mode === "register" && (
                <Input
                  label="节点昵称"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="生态节点·自定义"
                />
              )}

              {msg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {msg}
                </div>
              )}

              <Button fullWidth size="lg" onClick={submit} loading={busy}>
                {busy ? "接入中..." : mode === "login" ? "接入平台" : "注册并获得初始积分"}
              </Button>

              {/* 演示账号快捷填充 — 内部测试用 */}
              <div className="pt-2 border-t border-gray-100">
                <div className="text-[10px] text-gray-400 mb-2">内部测试账号</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => fillDemo("demo", "Towngas@2026!Demo")}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 hover:border-[#00a650] hover:text-[#00a650] transition-colors"
                  >
                    演示节点
                  </button>
                  <button
                    onClick={() => fillDemo("admin", "Towngas@2026!Admin")}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 hover:border-[#00a650] hover:text-[#00a650] transition-colors"
                  >
                    超级管理员
                  </button>
                  <button
                    onClick={() => fillDemo("ops", "Towngas@2026!Ops")}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 hover:border-[#00a650] hover:text-[#00a650] transition-colors"
                  >
                    运营
                  </button>
                  <button
                    onClick={() => fillDemo("finance", "Towngas@2026!Fin")}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 hover:border-[#00a650] hover:text-[#00a650] transition-colors"
                  >
                    财务
                  </button>
                </div>
              </div>

              <Link href="/" className="block text-center text-xs text-[#00a650] hover:text-[#008153] transition-colors">
                返回大厅 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
