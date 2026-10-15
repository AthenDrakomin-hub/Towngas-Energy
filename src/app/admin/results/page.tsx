"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Empty, Metric } from "@/components/ui/Panel";
import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";
import { fmtInt, RESULT_LABEL } from "@/lib/format";

export default function AdminResults() {
  const [msg, setMsg] = useState<string | null>(null);
  const [car, setCar] = useState("4,3,9,7,6,5,1,2,10,8");
  const [direction, setDirection] = useState<"up" | "down" | "draw">("up");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<{ id: number; code: string } | null>(null);

  const rules = useQuery({
    queryKey: ["ad-rules"],
    queryFn: async () => (await fetch("/api/admin/results/rules")).json(),
  });
  const history = useQuery({
    queryKey: ["ad-result-history"],
    queryFn: async () => (await fetch("/api/admin/results/history")).json(),
    refetchInterval: 15000,
  });
  const rounds = useQuery({
    queryKey: ["ad-round-list"],
    queryFn: async () => (await fetch("/api/rounds/history?limit=30")).json(),
    refetchInterval: 15000,
  });

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 4000);
  };

  const cfg = rules.data?.data?.config;

  const preview = async () => {
    const res = await fetch("/api/admin/results/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ car: car.split(",").map((s) => Number(s.trim())) }),
    });
    const json = await res.json();
    flash(json.ok ? `预览：${RESULT_LABEL[json.data.result]} · ${json.data.note}` : json.message);
  };

  const saveRules = async (patch: Record<string, unknown>) => {
    const res = await fetch("/api/admin/results/rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    flash(json.ok ? "清算规则已切换（运行时生效）" : json.message);
    rules.refetch();
  };

  const overrideNext = async () => {
    const res = await fetch("/api/admin/results/override-next", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction, note }),
    });
    const json = await res.json();
    flash(json.ok ? `下一周期结果已指定为 ${direction}` : json.message);
  };

  const overrideRound = async () => {
    if (!target) return;
    const res = await fetch(`/api/admin/rounds/${target.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction, note, resettle: true }),
    });
    const json = await res.json();
    flash(json.ok ? `周期 ${target.code} 已覆盖并重新清算` : json.message);
    history.refetch();
  };

  const rows: { code: string; startTime: string; result: string | null; resultSource: string | null; settleCar: number[] | null; totalPool: number; rakeAmount: number }[] =
    history.data?.data?.rows ?? [];
  const anomalies: { code: string; resultSource: string | null }[] = history.data?.data?.anomalies ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">结果控制台</h1>
        {msg && <Badge tone="warning">{msg}</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="清算规则配置" status="idle">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">当前规则</span>
              <Badge tone="primary">{cfg?.settlementRule ?? "--"}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => saveRules({ settlementRule: "A" })}>仅规则A（奇偶）</Button>
              <Button variant="secondary" className="flex-1" onClick={() => saveRules({ settlementRule: "A+B" })}>A + 五因子仲裁</Button>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={Boolean(cfg?.aiArbitration)} onChange={(e) => saveRules({ aiArbitration: e.target.checked })} className="accent-primary" />
              平局时启用 五因子仲裁（55% 概率）
            </label>
            <Button variant="danger" className="w-full" onClick={async () => {
              const res = await fetch("/api/admin/results/clear-overrides", { method: "POST" });
              const json = await res.json();
              flash(json.ok ? "已清空待生效的覆盖指令" : json.message);
            }}>清空待生效覆盖指令</Button>
            <div className="border-t border-gray-200 pt-3 text-[10px] leading-relaxed text-gray-400">
              规则A：综合指数末位奇偶 × 和值末位奇偶 → 同奇看多 / 同偶看空 / 一奇一偶平局。
              管理端指定结果优先级最高，且不会向客户端暴露来源标签。
            </div>
          </div>
        </Card>

        <Card title="规则预览" status="live">
          <div className="space-y-3">
            <Input label="填入 car 数组（10 维）" value={car} onChange={(e) => setCar(e.target.value)} />
            <Button variant="primary" className="w-full" onClick={preview}>预览结算结果</Button>
            <p className="text-[10px] leading-relaxed text-gray-400">预览不会写入数据库，仅用于校验规则引擎与数据映射是否符合预期。</p>
          </div>
        </Card>

        <Card title="手动指定结果" status="warn">
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["up", "down", "draw"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={clsx(
                    "flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                    direction === d
                      ? d === "up" ? "bg-success/20 text-success border border-success/50" : d === "down" ? "bg-danger/20 text-danger border border-danger/50" : "bg-warning/20 text-warning border border-warning/50"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-primary/50"
                  )}
                >
                  {RESULT_LABEL[d]}
                </button>
              ))}
            </div>
            <Input label="备注（写入管理日志）" value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选" />
            <Button variant="primary" className="w-full" onClick={overrideNext}>指定下一周期结果</Button>
            <div>
              <div className="label mb-2">或指定历史周期并重新清算</div>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    const found = (rounds.data?.data ?? []).find((r: { id: number }) => r.id === Number(e.target.value));
                    setTarget(found ? { id: found.id, code: found.code } : null);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600 outline-none focus:border-primary"
                >
                  <option value="">选择周期</option>
                  {(rounds.data?.data ?? []).map((r: { id: number; code: string }) => (
                    <option key={r.id} value={r.id}>{r.code}</option>
                  ))}
                </select>
                <Button variant="ghost" disabled={!target} onClick={overrideRound}>覆盖并清算</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "结果样本", value: fmtInt(rows.length), tone: "text-gray-800" },
          { label: "看多", value: fmtInt(rows.filter((r) => r.result === "up").length), tone: "text-success" },
          { label: "看空", value: fmtInt(rows.filter((r) => r.result === "down").length), tone: "text-danger" },
          { label: "平局", value: fmtInt(rows.filter((r) => r.result === "draw").length), tone: "text-warning" },
        ].map((m) => (
          <div key={m.label} className="glass rounded-xl p-4">
            <div className="label">{m.label}</div>
            <div className={`num mt-1 text-lg font-bold ${m.tone}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <Card title="结果历史 / 异常检测" status="live">
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white text-gray-500 z-10">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-medium">周期</th>
                <th className="px-3 py-2.5 text-left font-medium">结果</th>
                <th className="px-3 py-2.5 text-left font-medium">来源</th>
                <th className="px-3 py-2.5 text-left font-medium">清算 EEI</th>
                <th className="px-3 py-2.5 text-right font-medium">总池</th>
                <th className="px-3 py-2.5 text-right font-medium">服务费</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-gray-100 hover:bg-gray-100/30 transition-colors">
                  <td className="num px-3 py-2 text-gray-800 font-medium">{r.code}</td>
                  <td className={clsx("px-3 py-2 font-medium", r.result === "up" ? "text-success" : r.result === "down" ? "text-danger" : "text-warning")}>
                    {RESULT_LABEL[r.result ?? ""] ?? "进行中"}
                  </td>
                  <td className={clsx("px-3 py-2", r.resultSource === "collector_gap" ? "text-warning" : r.resultSource === "admin_override" ? "text-primary" : "text-gray-400")}>
                    {r.resultSource ?? "--"}
                  </td>
                  <td className="num px-3 py-2 text-gray-400">{(r.settleCar ?? []).join(",") || "--"}</td>
                  <td className="num px-3 py-2 text-right text-gray-800">{fmtInt(r.totalPool)}</td>
                  <td className="num px-3 py-2 text-right text-warning">{fmtInt(r.rakeAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty />}
        </div>
        <div className="mt-3 border-t border-gray-200 pt-3 text-[10px] text-gray-400">
          异常来源标记：collector_gap（ES-77 数据缺口，投资份额退还） · admin_override（管理端指定） · 当前异常 {anomalies.length} 条
        </div>
      </Card>
    </div>
  );
}
