"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Shell } from "@/components/Shell";
import { Card } from "@/components/ui/display/Card";
import { Empty, Tabs } from "@/components/ui/Panel";
import { Input } from "@/components/ui/form/Input";
import { Button } from "@/components/ui/form/Button";

type LogRow = { id: number; ts: string; level: string; module: string; message: string };
const LEVELS = ["all", "info", "data", "debug", "warn", "error"] as const;

export default function TerminalPage() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [auto, setAuto] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(async () => {
      const params = new URLSearchParams({ limit: "120" });
      if (level !== "all") params.set("level", level);
      if (query) params.set("q", query);
      const res = await fetch(`/api/logs?${params.toString()}`);
      const json = await res.json();
      if (json.ok) setRows(json.data as LogRow[]);
    }, 2000);
    return () => clearInterval(t);
  }, [level, query]);

  useEffect(() => {
    if (auto) bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows, auto]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">星云运行日志</h1>
          <Tabs items={LEVELS.map((l) => ({ key: l, label: l.toUpperCase() }))} value={level} onChange={setLevel} />
          <div className="ml-auto flex items-center gap-2">
            <div className="w-48">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setQuery(keyword)}
                placeholder="关键词搜索"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setQuery(keyword)}>搜索</Button>
            <a href={`/api/logs?limit=400${level !== "all" ? `&level=${level}` : ""}`}>
              <Button variant="ghost" size="sm">导出</Button>
            </a>
          </div>
        </div>

        <Card title="实时日志流" status={auto ? "live" : "off"} right={<span className="text-[10px]">{rows.length} 行</span>}>
          <div className="flex h-[560px] flex-col-reverse overflow-y-auto pr-2 font-mono text-[11px] leading-[1.7] rounded-lg bg-gray-50/50 p-3">
            <div>
              {rows.length === 0 && <Empty text="暂无日志" />}
              {rows.map((l) => (
                <div key={l.id} className="animate-tick-in flex gap-2 whitespace-nowrap">
                  <span className="text-gray-400">[{new Date(l.ts).toISOString().slice(11, 23)}]</span>
                  <span
                    className={clsx(
                      "w-14 shrink-0",
                      l.level === "warn" ? "text-warning" : l.level === "error" ? "text-danger" : "text-primary",
                    )}
                  >
                    {l.module}
                  </span>
                  <span className="text-gray-600/85">{l.message}</span>
                </div>
              ))}
              <div ref={bottom} />
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-primary" />
            自动滚动到底部
          </label>
          <span>· 日志包含真实采集事件与运行时模板流</span>
        </div>
      </div>
    </Shell>
  );
}
