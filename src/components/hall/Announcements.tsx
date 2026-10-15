"use client";

import { Card } from "@/components/ui/display/Card";
import { Badge } from "@/components/ui/display/Badge";
import { Empty } from "@/components/ui/enterprise/Empty";

type Announcement = {
  id: number;
  title: string;
  content: string;
  type: string;
};

/**
 * Announcements — 平台公告
 */
export function Announcements({ items }: { items: Announcement[] }) {
  return (
    <Card title="平台公告" status="idle">
      <div className="space-y-2">
        {items.slice(0, 3).map((a) => (
          <div key={a.id} className="rounded-lg bg-bg-1 p-2.5">
            <div className="flex items-center gap-2">
              <Badge tone={a.type === "warning" ? "warning" : "primary"}>{a.type === "warning" ? "提醒" : "通知"}</Badge>
              <span className="truncate text-xs text-text-1">{a.title}</span>
            </div>
            <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-text-3">{a.content}</p>
          </div>
        ))}
        {!items.length && <Empty text="暂无公告" />}
      </div>
    </Card>
  );
}
