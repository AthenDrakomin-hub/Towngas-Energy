"use client";

import clsx from "clsx";

/**
 * Avatar — 头像
 */
export function Avatar({
  name,
  src,
  size = "md",
  color,
}: {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}) {
  const sizeMap = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  const bg = color || "#00a650";
  if (src) {
    return <img src={src} alt={name} className={clsx("rounded-full object-cover", sizeMap[size])} />;
  }
  return (
    <div
      className={clsx("flex items-center justify-center rounded-full font-bold text-white", sizeMap[size])}
      style={{ backgroundColor: bg }}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}
