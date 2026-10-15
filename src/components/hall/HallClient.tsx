"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/feedback/Toast";
import { useT } from "@/components/ContentConfigProvider";
import { type PeriodKey } from "@/lib/constants";
import { fmtX } from "@/lib/format";
import { useSession } from "@/components/Shell";
import { PeriodSwitcher } from "./PeriodSwitcher";
import { RoundHeader } from "./RoundHeader";
import { CarChart } from "./CarChart";
import { OrderFlow } from "./OrderFlow";
import { TerminalLog } from "./TerminalLog";
import { BetPanel } from "./BetPanel";
import { SignalPanel } from "./SignalPanel";
import { EeiDisplay } from "./EeiDisplay";
import { Leaderboard } from "./Leaderboard";
import { MyBets } from "./MyBets";
import { Announcements } from "./Announcements";
import { BetModal } from "./BetModal";
import { SettleOverlay } from "./SettleOverlay";
import { RemindDialog } from "./RemindDialog";
import type { Round, Car, LogRow, Settled, LbRow } from "./types";

export function HallClient() {
  const { data: session } = useSession();
  const me = session?.data ?? null;
  const { toast } = useToast();
  const t = useT();

  const [round, setRound] = useState<Round | null>(null);
  const [car, setCar] = useState<Car | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [board, setBoard] = useState<LbRow[]>([]);
  const [tick, setTick] = useState(0);
  const [modalSide, setModalSide] = useState<"up" | "down" | null>(null);
  const [amount, setAmount] = useState(1000);
  const [lbKind, setLbKind] = useState<"day" | "week" | "all">("day");
  const [remind, setRemind] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("5m");
  const mountedAt = useRef(Date.now());

  // 秒针
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // SSE 连接
  useEffect(() => {
    const es = new EventSource(`/api/stream?period=${period}`);
    const on = (name: string, handler: (data: unknown) => void) => {
      es.addEventListener(name, (ev) => {
        try {
          handler(JSON.parse((ev as MessageEvent).data));
        } catch {
          /* ignore */
        }
      });
    };
    on("round:current", (d) => setRound(d as Round));
    on("car:update", (d) => setCar(d as Car));
    on("logs", (d) => setLogs((prev) => [...(d as LogRow[]).reverse(), ...prev].slice(0, 60)));
    on("round:settled", (d) => {
      const s = d as Settled;
      setSettled(s);
      setTimeout(() => setSettled(null), 4200);
    });
    on("leaderboard:update", (d) => {
      const rows = (d as LbRow[]).slice(0, 8);
      if (rows.length) setBoard(rows);
    });
    return () => es.close();
  }, [period]);

  // 30 分钟参与提醒
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - mountedAt.current > 30 * 60 * 1000) setRemind(true);
    }, 20000);
    return () => clearInterval(t);
  }, []);

  // API 数据
  const { data: signal } = useQuery({
    queryKey: ["signal", period],
    queryFn: async () => (await fetch(`/api/signal/current?period=${period}`)).json(),
    refetchInterval: 6000,
  });
  const { data: lb } = useQuery({
    queryKey: ["leaderboard", lbKind],
    queryFn: async () => (await fetch(`/api/leaderboard?kind=${lbKind}`)).json(),
    refetchInterval: 15000,
  });
  const { data: announcements } = useQuery({
    queryKey: ["ann"],
    queryFn: async () => (await fetch("/api/announcements")).json(),
    refetchInterval: 60000,
  });
  const { data: carHistory } = useQuery({
    queryKey: ["car-history"],
    queryFn: async () => (await fetch("/api/car/history?limit=180")).json(),
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (lb?.data) setBoard((lb.data as LbRow[]).slice(0, 8));
  }, [lb]);

  // 倒计时秒数
  const seconds = useMemo(() => {
    if (!round) return 0;
    const target = round.phase === "betting" ? new Date(round.lockTime).getTime() : new Date(round.settleTime).getTime();
    return Math.max(0, Math.floor((target - Date.now()) / 1000));
  }, [round, tick]);

  const historyRows: { onlinetime: string; car: number[] }[] = carHistory?.data?.rows ?? [];
  const signalData = signal?.data;
  const announcementsData = announcements?.data ?? [];

  // 投资提交
  const submit = useCallback(async () => {
    if (!round || !modalSide) return;
    if (Number(localStorage.getItem("cnx_cooldown_until") ?? 0) > Date.now()) {
      toast("冷静期生效中，暂无法建立投资份额", "warning");
      return;
    }
    const res = await fetch(`/api/rounds/${round.id}/bets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ side: modalSide, amount }),
    });
    const json = await res.json();
    setModalSide(null);
    if (json.ok) {
      toast(`投资份额已建立 · 预估结算率 ${fmtX(json.data.estimatedRatio)}`, modalSide === "up" ? "success" : "danger");
      setRound((prev) => (prev && json.data.snapshot ? (json.data.snapshot as Round) : prev));
    } else {
      toast(json.message ?? "建立失败", "warning");
    }
  }, [amount, round, modalSide, toast]);

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
      {settled && <SettleOverlay data={settled} />}
      {remind && <RemindDialog onClose={() => setRemind(false)} />}

      <PeriodSwitcher period={period} onChange={setPeriod} />

      <RoundHeader round={round} seconds={seconds} t={t} />

      {/* 主内容三栏 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* 左栏 */}
        <div className="flex flex-col gap-4 xl:col-span-5">
          <CarChart historyRows={historyRows} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <OrderFlow round={round} />
            <TerminalLog logs={logs} />
          </div>
        </div>

        {/* 中栏 */}
        <div className="flex flex-col gap-4 xl:col-span-4">
          <BetPanel round={round} me={me} t={t} onOpenBet={(side) => setModalSide(side)} />
          <SignalPanel signalData={signalData} />
        </div>

        {/* 右栏 */}
        <div className="flex flex-col gap-4 xl:col-span-3">
          <EeiDisplay car={car} />
          <Leaderboard board={board} lbKind={lbKind} onKindChange={setLbKind} />
          <MyBets round={round} />
          <Announcements items={announcementsData} />
        </div>
      </div>

      <BetModal
        open={modalSide !== null}
        side={modalSide}
        amount={amount}
        onAmountChange={setAmount}
        onClose={() => setModalSide(null)}
        onConfirm={submit}
        round={round}
      />
    </div>
  );
}
