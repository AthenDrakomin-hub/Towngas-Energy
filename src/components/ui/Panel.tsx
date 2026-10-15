import type { ReactNode } from "react";
import clsx from "clsx";

export function Panel({
  title,
  status = "live",
  stamp,
  right,
  children,
  className,
  bodyClass,
}: {
  title: ReactNode;
  status?: "live" | "warn" | "off" | "idle";
  stamp?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  const color =
    status === "live" ? "bg-up" : status === "warn" ? "bg-down" : status === "idle" ? "bg-blue" : "bg-mute";
  return (
    <section className={clsx("panel flex min-w-0 flex-col", className)}>
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-line px-2.5">
        <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", color, status === "live" && "dot-live")} />
        <h2 className="truncate text-[11px] font-semibold tracking-[0.16em] text-ink/90 uppercase">{title}</h2>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-mute">
          {right}
          {stamp ? <span className="num">{stamp}</span> : null}
        </div>
      </header>
      <div className={clsx("min-w-0 flex-1 p-2.5", bodyClass)}>{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  unit,
  tone = "ink",
  size = "md",
  sub,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: "ink" | "up" | "down" | "gold" | "mute" | "blue";
  size?: "sm" | "md" | "lg" | "xl";
  sub?: ReactNode;
}) {
  const toneClass = {
    ink: "text-ink",
    up: "text-up",
    down: "text-down",
    gold: "text-gold",
    mute: "text-mute",
    blue: "text-blue",
  }[tone];
  const sizeClass = { sm: "text-sm", md: "text-lg", lg: "text-2xl", xl: "text-4xl" }[size];
  return (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className={clsx("num mt-0.5 font-bold leading-none", sizeClass, toneClass)}>
        {value}
        {unit ? <span className="ml-1 text-[10px] font-medium tracking-wider text-mute">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-1 text-[10px] text-mute">{sub}</div> : null}
    </div>
  );
}

export function Bar({
  value,
  tone = "up",
  height = 6,
  label: barLabel,
}: {
  value: number;
  tone?: "up" | "down" | "gold" | "blue";
  height?: number;
  label?: string;
}) {
  const toneClass = { up: "bg-up", down: "bg-down", gold: "bg-gold", blue: "bg-blue" }[tone];
  return (
    <div className="w-full">
      <div className="w-full overflow-hidden bg-line/60" style={{ height }}>
        <div className={clsx("bar-fill h-full", toneClass)} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
      </div>
      {barLabel ? <div className="mt-1 text-[10px] text-mute">{barLabel}</div> : null}
    </div>
  );
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex items-end gap-4 overflow-x-auto">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={clsx(
            "shrink-0 border-b-2 px-1 pb-1 text-[11px] font-medium tracking-wider transition-colors",
            value === item.key ? "tab-active" : "border-transparent text-mute hover:text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  children,
  tone = "mute",
}: {
  children: ReactNode;
  tone?: "up" | "down" | "gold" | "blue" | "mute";
}) {
  const map = {
    up: "border-up/40 text-up",
    down: "border-down/40 text-down",
    gold: "border-gold/40 text-gold",
    blue: "border-blue/40 text-blue",
    mute: "border-line text-mute",
  }[tone];
  return <span className={clsx("border px-1.5 py-0.5 text-[10px] font-medium tracking-wider", map)}>{children}</span>;
}

export function Empty({ text = "暂无数据" }: { text?: string }) {
  return <div className="flex h-full min-h-16 items-center justify-center text-[11px] text-mute">{text}</div>;
}
