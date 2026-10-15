"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={clsx("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-text-1">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-text-3">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
