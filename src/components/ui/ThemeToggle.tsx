"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type Theme = "light" | "dark";

/**
 * ThemeToggle — 明暗主题切换按钮
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cnx_theme") as Theme | null;
    const initial = saved ?? "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cnx_theme", next);
  };

  if (!mounted) {
    return <div className={clsx("h-9 w-9 rounded-lg", className)} />;
  }

  return (
    <button
      onClick={toggle}
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-bg-1 text-text-2 transition-colors hover:bg-bg-2",
        className,
      )}
      title={theme === "light" ? "切换暗色模式" : "切换浅色模式"}
    >
      {theme === "light" ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}
