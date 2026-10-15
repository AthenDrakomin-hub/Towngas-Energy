"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, suffix, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block mb-1.5 text-xs font-medium text-text-2">
            {label}
          </label>
        )}
        <div
          className={clsx(
            "flex items-center rounded-lg border bg-bg-1 transition-colors duration-150",
            "focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(46,163,242,0.1)]",
            error ? "border-danger" : "border-line hover:border-line-light",
          )}
        >
          {prefix && <span className="pl-3 text-text-3 text-sm shrink-0">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              "flex-1 bg-transparent px-3 py-2.5 text-sm text-text-1 placeholder:text-text-4",
              "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
              prefix && "pl-1",
              suffix && "pr-1",
              className,
            )}
            {...props}
          />
          {suffix && <span className="pr-3 text-text-3 text-sm shrink-0">{suffix}</span>}
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
