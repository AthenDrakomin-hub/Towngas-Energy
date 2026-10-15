"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Empty, Metric } from "@/components/ui/Panel";
import { Card } from "@/components/ui/display/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/display/DataTable";
import { Badge } from "@/components/ui/display/Badge";
import { Button } from "@/components/ui/form/Button";
import { Modal } from "@/components/ui/feedback/Modal";
import { fmtInt, fmtPct, fmtX, RESULT_LABEL } from "@/lib/format";

type Cfg = {
  roundDurationSec: number;
  bettingWindowSec: number;
  rakeRate: number;
  minBet: number;
  maxBetPerRound: number;
  maxDailyStake: number;
  marketMaking: boolean;
  marketMakingIntensity: number;
  settlementRule: string;
  aiArbitration: boolean;
};

const NUM_FIELDS: [keyof Cfg, string][] = [
  ["roundDurationSec", "周期时长（秒）"],
  ["bettingWindowSec", "投资窗口（秒）"],
  ["minBet", "最小投资份额"],
  ["maxBetPerRound", "单周期上限"],
  ["maxDailyStake", "每日上限"],
  ["marketMakingIntensity", "流动性维护强度"],
];

export default function AdminRounds() {
  const [msg, setMsg] = useState<string | null>(null);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const state = useQuery({
    queryKey: ["ad-round-state"],
    queryFn: async () => (await fetch("/api/admin/rounds/current/state")).json(),
    refetchInterval: 3000,
  });
  const history = useQuery({
    queryKey: ["ad-round-history"],
    queryFn: async () => (await fetch("/api/rounds/history?limit=40")).json(),
    refetchInterval: 10000,
  });
  const replay = useQuery({
    queryKey: ["ad-replay", open],
    enabled: open != null,
    queryFn: async () => (await fetch(`/api/admin/rounds/${open}`)).json(),
  });

  const data = state.data?.data;
  const round = data?.round;
  const live = (data?.config ?? null) as Cfg | null;
  const current: Cfg | null = cfg ?? live;

  // 当前周期投资份额流表格列定义
  type OpenBetRow = { nickname: string; side: string; amount: number; isFake: boolean; createdAt: string };
  const openBetColumns: DataTableColumn<OpenBetRow>[] = [
    { key: "nickname", title: "节点", render: (b) => <span className="text-gray-800">{b.nickname}</span> },
    {
      key: "side",
      title: "方向",
      render: (b) => <span className={clsx("font-medium", b.side === "up" ? "text-success" : "text-danger")}>{b.side === "up" ? "看多" : "看空"}</span>,
    },
    { key: "amount", title: "数量", align: "right", render: (b) => <span className="num text-gray-800">{fmtInt(b.amount)}</span> },
    { key: "isFake", title: "类型", render: (b) => <span className="text-gray-400">{b.isFake ? "流动性维护节点" : "真实节点"}</span> },
    { key: "createdAt", title: "时间", render: (b) => <span className="num text-gray-400">{b.createdAt.slice(11, 19)}</span> },
  ];

  // 周期回放表格列定义
  type HistoryRow = { id: number; code: string; result: string | null; resultSource: string | null; totalPool: number; rakeAmount: number };
  const historyColumns: DataTableColumn<HistoryRow>[] = [
    { key: "code", title: "周期", render: (r) => <span className="num text-gray-800 font-medium">{r.code}</span> },
    {
      key: "result",
      title: "结果",
      render: (r) => (
        <span className={clsx("font-medium", r.result === "up" ? "text-success" : r.result === "down" ? "text-danger" : "text-warning")}>
          {RESULT_LABEL[r.result ?? ""] ?? "进行中"}
        </span>
      ),
    },
    { key: "resultSource", title: "来源", render: (r) => <span className="text-gray-400">{r.resultSource ?? "--"}</span> },
    { key: "totalPool", title: "总池", align: "right", render: (r) => <span className="num text-gray-800">{fmtInt(r.totalPool)}</span> },
    { key: "rakeAmount", title: "服务费", align: "right", render: (r) => <span className="num text-warning">{fmtInt(r.rakeAmount)}</span> },
    {
      key: "actions",
      title: "操作",
      align: "right",
      render: (r) => <Button size="sm" variant="ghost" onClick={() => setOpen(r.id)}>回放</Button>,
    },
  ];

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  };

  const act = async (action: string) => {
    const res = await fetch(`/api/admin/rounds/current/${action}`, { method: "POST" });
    const json = await res.json();
    flash(json.ok ? `${action} 已执行` : json.message);
    state.refetch();
  };

  const saveCfg = async () => {
    if (!cfg) return;
    const res = await fetch("/api/admin/rounds/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cfg),
    });
    const json = await res.json();
    flash(json.ok ? "周期参数已保存（运行时生效）" : json.message);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-800">轮次控制台</h1>
        <Badge tone={round?.phase === "betting" ? "success" : "warning"} dot>{round?.status ?? "--"}</Badge>
        <span className="text-xs text-gray-400">当前周期 {round?.code}</span>
        {msg && <Badge tone="warning">{msg}</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="实时周期监控" status="live" stamp="3s 刷新">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="周期" value={round?.code ?? "--"} size="sm" tone="gold" />
            <Metric label="状态" value={round?.status ?? "--"} size="sm" />
            <Metric label="剩余锁定" value={`${round?.secondsToLock ?? 0}s`} size="sm" tone="down" />
            <Metric label="清算剩余" value={`${round?.secondsToSettle ?? 0}s`} size="sm" tone="mute" />
            <Metric label="总池" value={fmtInt(round?.totalPool)} />
            <Metric label="看多池" value={fmtInt(round?.upPool)} tone="up" />
            <Metric label="看空池" value={fmtInt(round?.downPool)} tone="down" />
            <Metric label="参与节点" value={fmtInt(round?.participants)} tone="mute" />
            <Metric label="结算率·涨" value={fmtX(round?.payoutUp)} tone="up" />
            <Metric label="结算率·跌" value={fmtX(round?.payoutDown)} tone="down" />
            <Metric label="服务费率" value={fmtPct(round?.rakeRate)} tone="gold" />
            <Metric label="服务费" value={fmtInt(round?.rakeAmount)} tone="mute" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["force-open", "强制开盘", "primary"],
              ["force-lock", "强制锁定", "primary"],
              ["force-settle", "强制清算", "success"],
              ["cancel", "取消周期", "danger"],
            ].map(([action, label, variant]) => (
              <Button key={action} variant={variant as "primary" | "success" | "danger"} onClick={() => act(action)}>{label}</Button>
            ))}
          </div>
        </Card>

        <Card title="周期参数配置" status="idle">
          {!current ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {NUM_FIELDS.map(([key, label]) => (
                <div key={String(key)} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">{label}</span>
                  <input
                    type="number"
                    value={Number(cfg ? cfg[key] : current[key])}
                    onChange={(e) => setCfg({ ...(cfg ?? current), [key]: Number(e.target.value) } as Cfg)}
                    className="num w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-xs text-gray-800 outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">服务费率</span>
                <input
                  type="number"
                  step="0.01"
                  value={cfg ? cfg.rakeRate : current.rakeRate}
                  onChange={(e) => setCfg({ ...(cfg ?? current), rakeRate: Number(e.target.value) } as Cfg)}
                  className="num w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-xs text-gray-800 outline-none focus:border-primary"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={cfg ? cfg.marketMaking : current.marketMaking} onChange={(e) => setCfg({ ...(cfg ?? current), marketMaking: e.target.checked } as Cfg)} className="accent-primary" />
                生态流动性维护节点
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={cfg ? cfg.aiArbitration : current.aiArbitration} onChange={(e) => setCfg({ ...(cfg ?? current), aiArbitration: e.target.checked } as Cfg)} className="accent-primary" />
                五因子仲裁（规则B）
              </label>
              <Button variant="primary" className="w-full" onClick={saveCfg}>保存配置</Button>
            </div>
          )}
        </Card>
      </div>

      <Card title="当前周期投资份额流" status="live">
        <DataTable<OpenBetRow & { _key: string }>
          columns={openBetColumns}
          data={(data?.openBets ?? []).map((b: OpenBetRow, i: number) => ({ ...b, _key: `${b.nickname}-${i}` }))}
          rowKey={(b) => b._key}
          emptyText="本周期暂无投资份额"
          pageSize={15}
        />
      </Card>

      <Card title="周期回放" status="idle">
        <DataTable<HistoryRow>
          columns={historyColumns}
          data={history.data?.data ?? []}
          rowKey={(r) => r.id}
          emptyText="暂无周期数据"
          pageSize={15}
        />
      </Card>

      {/* 周期回放Modal */}
      <Modal open={open != null} onClose={() => setOpen(null)} title="周期数据流回放" size="lg">
        {replay.data?.data ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-4 gap-3">
              <Metric label="结果" value={RESULT_LABEL[replay.data.data.round.result] ?? "--"} size="sm" tone="gold" />
              <Metric label="来源" value={replay.data.data.round.resultSource ?? "--"} size="sm" />
              <Metric label="总池" value={fmtInt(replay.data.data.round.totalPool)} size="sm" />
              <Metric label="服务费" value={fmtInt(replay.data.data.round.rakeAmount)} size="sm" tone="mute" />
            </div>
            <div>
              <div className="label mb-2">分析 / 清算数据</div>
              <pre className="max-h-52 overflow-auto rounded-lg bg-white p-3 font-mono text-[10px] text-gray-500">
                {JSON.stringify({ analysis: replay.data.data.analysis, settlement: replay.data.data.settlement }, null, 2)}
              </pre>
            </div>
            <div>
              <div className="label mb-2">EEI 数据流窗口</div>
              <div className="max-h-52 overflow-auto rounded-lg bg-white p-3 font-mono text-[10px]">
                {(replay.data.data.window ?? []).map((w: { onlinetime: string; car: number[] }) => (
                  <div key={w.onlinetime} className="text-gray-500 py-0.5">{w.onlinetime.slice(11, 19)} │ 指数=[{w.car.join(",")}]</div>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-2">投资份额明细</div>
              <div className="max-h-52 overflow-auto rounded-lg bg-white p-3">
                {(replay.data.data.positions ?? []).map(
                  (p: { nickname: string; side: string; amount: number; status: string; isFake: boolean }, i: number) => (
                    <div key={i} className="flex justify-between py-1 text-[11px] border-b border-gray-200/30 last:border-0">
                      <span className={p.isFake ? "text-gray-400" : "text-gray-800"}>{p.nickname} {p.isFake ? "·流动性维护" : ""}</span>
                      <span className="num text-gray-500">{p.side === "up" ? "涨" : "跌"} {fmtInt(p.amount)} → {p.status === "settled" ? "已结算" : p.status === "pending" ? "待清算" : p.status}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500">载入中...</div>
        )}
      </Modal>
    </div>
  );
}
