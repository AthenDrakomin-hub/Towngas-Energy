"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";
import { Badge } from "@/components/ui/display/Badge";
import { useToast } from "@/components/ui/feedback/Toast";

type ConfigItem = {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  updatedAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  platform: "平台信息",
  nav: "导航菜单",
  trading: "交易大厅",
  login: "登录页",
  me: "个人中心",
  admin: "管理端",
  period: "周期标签",
  common: "通用",
};

export default function AdminContentConfigPage() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("platform");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-content-config"],
    queryFn: async () => {
      const res = await fetch("/api/content-config?meta=1");
      const json = await res.json();
      return json?.data ?? [];
    },
  });

  const items: ConfigItem[] = data ?? [];

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(
    () => items.filter((i) => i.category === activeCategory),
    [items, activeCategory],
  );

  const dirtyCount = useMemo(
    () => Object.entries(edits).filter(([k, v]) => items.find((i) => i.key === k)?.value !== v).length,
    [edits, items],
  );

  const handleChange = (key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const updates = Object.entries(edits)
      .filter(([k, v]) => items.find((i) => i.key === k)?.value !== v)
      .map(([key, value]) => ({ key, value }));
    if (!updates.length) {
      toast("没有需要保存的修改", "warning");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/content-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (json?.ok) {
        toast(`已保存 ${updates.length} 项文案配置`, "success");
        setEdits({});
        refetch();
      } else {
        toast(json?.message ?? "保存失败", "danger");
      }
    } catch {
      toast("保存失败，请重试", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (key: string) => {
    const original = items.find((i) => i.key === key)?.value ?? "";
    setEdits((prev) => ({ ...prev, [key]: original }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">文案配置</h1>
          <p className="text-sm text-gray-500">修改后即时生效，无需重新部署</p>
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <Badge tone="warning">{dirtyCount} 项未保存</Badge>
          )}
          <Button onClick={handleSave} loading={saving}>
            保存修改
          </Button>
        </div>
      </div>

      {/* 分类Tab */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeCategory === cat
                ? "bg-[#00a650] text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
            <span className="ml-1 text-xs opacity-70">
              ({items.filter((i) => i.category === cat).length})
            </span>
          </button>
        ))}
      </div>

      {/* 配置项列表 */}
      <Card title={`${CATEGORY_LABELS[activeCategory] ?? activeCategory}（${filteredItems.length}项）`}>
        {isLoading && <div className="py-8 text-center text-gray-400">加载中...</div>}
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const value = edits[item.key] ?? item.value;
            const isDirty = edits[item.key] !== undefined && edits[item.key] !== item.value;
            return (
              <div
                key={item.key}
                className={`rounded-lg border p-3 transition-colors ${
                  isDirty ? "border-[#00a650] bg-green-50" : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-500">{item.key}</code>
                    {isDirty && <Badge tone="primary">已修改</Badge>}
                  </div>
                  {isDirty && (
                    <button
                      onClick={() => handleReset(item.key)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      还原
                    </button>
                  )}
                </div>
                {item.description && (
                  <div className="mb-1.5 text-xs text-gray-400">{item.description}</div>
                )}
                <Input
                  value={value}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
