"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";

export const dynamic = "force-dynamic";

interface ErrorLog {
  id: number;
  message: string;
  stack?: string;
  url: string;
  userAgent?: string;
  userId?: number;
  createdAt: string;
}

export default function AdminErrorsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/admin/errors", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setLogs(json.data.list || []);
        setLoading(false);
      });
  }, []);

  const filtered = filter
    ? logs.filter((l) => l.message.includes(filter) || l.url.includes(filter))
    : logs;

  if (loading) return <div className="p-6 text-gray-500">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">错误日志</h1>
        <input
          type="text"
          placeholder="搜索错误信息..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
        />
      </div>

      <Card title={`共 ${filtered.length} 条错误`} status="live">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-gray-400">暂无错误记录</p>
          ) : (
            filtered.map((log) => (
              <div key={log.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-red-600 text-sm">{log.message}</div>
                    <div className="mt-1 text-xs text-gray-400">
                      {log.url} · {new Date(log.createdAt).toLocaleString()}
                      {log.userId ? ` · 用户#${log.userId}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className="ml-2 text-xs text-blue-500 hover:underline shrink-0"
                  >
                    {expanded === log.id ? "收起" : "详情"}
                  </button>
                </div>
                {expanded === log.id && log.stack && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                    {log.stack}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
