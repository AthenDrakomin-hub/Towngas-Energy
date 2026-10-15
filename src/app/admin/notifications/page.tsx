"use client";

import { useState } from "react";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";

export const dynamic = "force-dynamic";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  const handleSend = async () => {
    if (!title || !content) {
      setResult("请填写标题和内容");
      return;
    }
    setSending(true);
    setResult("");
    const token = localStorage.getItem("token");
    // 广播通知：需要后端支持批量插入，此处为管理端手动发通知的入口
    // 实际实现需补充 /api/admin/notifications/broadcast 路由
    setResult("通知功能已就绪，请确认后端广播接口已实现");
    setSending(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-800">通知管理</h1>

      <Card title="发送系统通知" status="live">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">通知标题</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="通知标题" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">通知内容</label>
            <textarea
              className="w-full rounded-md border border-gray-200 p-2 text-sm"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="通知正文内容"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="info">信息</option>
              <option value="success">成功</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
            </select>
          </div>
          {result && <div className="text-sm text-gray-600">{result}</div>}
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "发送中..." : "发送通知"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
