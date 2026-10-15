"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";

interface ErrorLog {
  id: number;
  message: string;
  stack?: string;
  url: string;
  userAgent?: string;
  createdAt: string;
}

export default function AdminErrorsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/admin/errors")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setLogs(json.data.list || []);
        }
        setLoading(false);
      });
  }, []);

  const filtered = filter
    ? logs.filter((l) => l.message.includes(filter) || l.url.includes(filter))
    : logs;

  if (loading) {
    return <div className="p-6 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">错误日志</h1>
        <input
          type="text"
          placeholder="搜索错误信息..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1 text-sm"
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
                    <div className="text-sm font-medium text-red-600">{log.message}</div>
                    <div className="mt-1 text-xs text-gray-400">
                      {log.url} · {new Date(log.createdAt).toLocaleString()}
                    </div>
                    {log.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-500">查看堆栈</summary>
                        <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                          {log.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
