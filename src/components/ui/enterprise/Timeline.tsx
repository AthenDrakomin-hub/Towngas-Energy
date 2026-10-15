"use client";

/**
 * Timeline — 时间线
 */
export function Timeline({ items }: { items: { time: string; title: string; desc?: string; color?: string }[] }) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div
              className="h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: item.color || "#00a650" }}
            />
            {i < items.length - 1 && <div className="mt-1 w-px flex-1 bg-gray-200" />}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-800">{item.title}</span>
              <span className="text-[10px] text-gray-400 num">{item.time}</span>
            </div>
            {item.desc && <p className="mt-0.5 text-[11px] text-gray-500">{item.desc}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
