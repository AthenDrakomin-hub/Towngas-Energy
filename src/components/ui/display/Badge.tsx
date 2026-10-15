"use client";

import { ReactNode } from "react";
import clsx from "clsx";

type Tone = "success" | "danger" | "warning" | "primary" | "mute";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

const toneStyles: Record<Tone, string> = {
  success: "border-success/40 text-success bg-success/10",
  danger: "border-danger/40 text-danger bg-danger/10",
  warning: "border-warning/40 text-warning bg-warning/10",
  primary: "border-primary/40 text-primary bg-primary/10",
  mute: "border-line text-text-3 bg-bg-2",
};

const dotColor: Record<Tone, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  primary: "bg-primary",
  mute: "bg-text-4",
};

export function Badge({ children, tone = "mute", dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full", dotColor[tone])} />}
      {children}
    </span>
  );
}
