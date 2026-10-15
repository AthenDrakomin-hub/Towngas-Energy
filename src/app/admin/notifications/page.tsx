"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";

interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setNotifications(json.data.list || []);
        }
        setLoading(false);
      });
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (loading) {
    return <div className="p-6 text-gray-500">加载中...</div>;
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">
          通知中心 {unread > 0 && <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{unread} 未读</span>}
        </h1>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200"
          >
            全部已读
          </button>
        )}
      </div>

      <Card title="系统通知" status="live">
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-gray-400">暂无通知</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border p-3 ${n.isRead ? "border-gray-100 bg-white" : "border-blue-100 bg-blue-50"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${TYPE_COLORS[n.type] || TYPE_COLORS.info}`}>
                        {n.type}
                      </span>
                      <span className="text-sm font-medium text-gray-800">{n.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{n.content}</p>
                    <div className="mt-1 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
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
