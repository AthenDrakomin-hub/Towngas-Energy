"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Empty, Metric } from "@/components/ui/Panel";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";

type Ann = { id: number; title: string; content: string; type: string; status: string; publishedAt: string | null };
type Ach = { id: number; code: string; name: string; description: string; icon: string; reward: number; condition: { metric: string; op: string; value: number } };

export default function AdminContent() {
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "info", status: "published" });
  const [tpl, setTpl] = useState("");
  const [ach, setAch] = useState({ code: "", name: "", description: "", metric: "rounds", op: ">=", value: 1, reward: 500 });

  const anns = useQuery({
    queryKey: ["ad-ann"],
    queryFn: async () => (await fetch("/api/admin/announcements")).json(),
  });
  const achs = useQuery({
    queryKey: ["ad-ach"],
    queryFn: async () => (await fetch("/api/admin/achievements")).json(),
  });
  const tpls = useQuery({
    queryKey: ["ad-tpl"],
    queryFn: async () => (await fetch("/api/admin/signal-templates")).json(),
  });

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 4000);
  };

  const createAnn = async () => {
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    flash(json.ok ? "公告已保存" : json.message);
    anns.refetch();
  };

  const updateAnn = async (id: number, patch: Record<string, unknown>) => {
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    anns.refetch();
  };

  const removeAnn = async (id: number) => {
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    anns.refetch();
  };

  const saveTpl = async () => {
    const templates = tpl.split("\n").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/admin/signal-templates", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templates }),
    });
    const json = await res.json();
    flash(json.ok ? `模板库已更新（${templates.length} 条）` : json.message);
  };

  const createAch = async () => {
    const res = await fetch("/api/admin/achievements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ach),
    });
    const json = await res.json();
    flash(json.ok ? "成就已创建" : json.message);
    achs.refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">内容控制台</h1>
        {msg && <Badge tone="warning">{msg}</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="发布公告 / 弹窗" status="idle">
          <div className="space-y-3">
            <Input placeholder="标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="正文"
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary resize-none"
            />
            <div className="flex gap-2">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600 outline-none focus:border-primary">
                <option value="info">通知</option>
                <option value="warning">提醒</option>
                <option value="maintenance">维护</option>
                <option value="signal">信号</option>
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600 outline-none focus:border-primary">
                <option value="published">立即发布</option>
                <option value="draft">存为草稿</option>
                <option value="offline">下线</option>
              </select>
            </div>
            <Button variant="primary" className="w-full" onClick={createAnn}>保存公告</Button>
          </div>
        </Card>

        <Card title="能源指数研判文案模板库" status="idle">
          <textarea
            value={tpl || (tpls.data?.data?.templates ?? []).join("\n")}
            onChange={(e) => setTpl(e.target.value)}
            rows={9}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-[11px] text-gray-800 outline-none focus:border-primary resize-none"
          />
          <Button variant="primary" className="mt-3 w-full" onClick={saveTpl}>更新模板库</Button>
          <p className="mt-2 text-[10px] text-gray-400">每行一条，用于 能源指数研判面板的解读文案轮换。</p>
        </Card>

        <Card title="成就配置" status="idle">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={ach.code} onChange={(e) => setAch({ ...ach, code: e.target.value })} placeholder="编码" className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-800 outline-none focus:border-primary" />
              <input value={ach.name} onChange={(e) => setAch({ ...ach, name: e.target.value })} placeholder="名称" className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-800 outline-none focus:border-primary" />
            </div>
            <input value={ach.description} onChange={(e) => setAch({ ...ach, description: e.target.value })} placeholder="描述" className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-800 outline-none focus:border-primary" />
            <div className="flex gap-2">
              <select value={ach.metric} onChange={(e) => setAch({ ...ach, metric: e.target.value })} className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600 outline-none focus:border-primary">
                {["rounds", "volume", "profit", "winRate", "settledBets"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input type="number" value={ach.value} onChange={(e) => setAch({ ...ach, value: Number(e.target.value) })} className="num w-20 rounded-lg border border-gray-200 bg-white px-2 py-2 text-right text-xs text-gray-800 outline-none focus:border-primary" />
              <input type="number" value={ach.reward} onChange={(e) => setAch({ ...ach, reward: Number(e.target.value) })} className="num w-20 rounded-lg border border-gray-200 bg-white px-2 py-2 text-right text-xs text-gray-800 outline-none focus:border-primary" />
            </div>
            <Button variant="primary" className="w-full" onClick={createAch}>创建成就</Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="公告管理" status="live" stamp={`${(anns.data?.data ?? []).length} 条`}>
          <div className="max-h-80 space-y-3 overflow-auto">
            {(anns.data?.data ?? []).map((a: Ann) => (
              <div key={a.id} className="rounded-lg bg-white p-3 border border-gray-200/50">
                <div className="flex items-center gap-2">
                  <Badge tone={a.type === "warning" ? "warning" : "primary"}>{a.type === "warning" ? "重要" : "普通"}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-800 font-medium">{a.title}</span>
                  <Badge tone={a.status === "published" ? "success" : "mute"}>{a.status === "published" ? "已发布" : "已下线"}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-gray-500">{a.content}</p>
                <div className="mt-2.5 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => updateAnn(a.id, { status: a.status === "published" ? "offline" : "published" })}>
                    {a.status === "published" ? "下线" : "发布"}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => removeAnn(a.id)}>删除</Button>
                </div>
              </div>
            ))}
            {!(anns.data?.data ?? []).length && <Empty />}
          </div>
        </Card>

        <Card title="成就 / 赛季配置" status="live">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white text-gray-500 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left font-medium">图标</th>
                  <th className="px-3 py-2.5 text-left font-medium">名称</th>
                  <th className="px-3 py-2.5 text-left font-medium">条件</th>
                  <th className="px-3 py-2.5 text-right font-medium">奖励</th>
                </tr>
              </thead>
              <tbody>
                {(achs.data?.data ?? []).map((a: Ach) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-100/30 transition-colors">
                    <td className="px-3 py-2 text-warning text-base">{a.icon}</td>
                    <td className="px-3 py-2 text-gray-800">{a.name}</td>
                    <td className="px-3 py-2 text-gray-400">{a.condition.metric} {a.condition.op} {a.condition.value}</td>
                    <td className="num px-3 py-2 text-right text-warning font-medium">{a.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-gray-200 pt-3">
            <Metric label="成就总数" value={(achs.data?.data ?? []).length} size="sm" />
            <Metric label="公告总数" value={(anns.data?.data ?? []).length} size="sm" tone="mute" />
            <Metric label="敏感词库" value="启用" size="sm" tone="blue" />
          </div>
        </Card>
      </div>
    </div>
  );
}
