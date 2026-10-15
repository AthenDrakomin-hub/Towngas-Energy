"use client";

import { useState } from "react";
import clsx from "clsx";
import { Input } from "./Input";
import { Button } from "./Button";

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  quickAmounts?: number[];
  placeholder?: string;
  disabled?: boolean;
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 1000000,
  step = 100,
  quickAmounts = [500, 1000, 5000, 10000],
  placeholder = "输入金额",
  disabled,
}: NumberInputProps) {
  const [slider, setSlider] = useState(value);

  const handleInput = (v: string) => {
    const n = Number(v.replace(/[^0-9]/g, ""));
    if (isNaN(n)) {
      onChange(0);
      setSlider(0);
    } else {
      const clamped = Math.max(min, Math.min(max, n));
      onChange(clamped);
      setSlider(clamped);
    }
  };

  const handleSlider = (v: number) => {
    setSlider(v);
    onChange(v);
  };

  const pct = max > min ? ((slider - min) / (max - min)) * 100 : 0;

  return (
    <div className="space-y-3">
      <Input
        type="text"
        inputMode="numeric"
        value={value || ""}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        prefix={<span className="text-warning font-bold">¥</span>}
        suffix={<span className="text-text-4">积分</span>}
        className="text-lg font-bold num"
      />

      {/* 滑块 */}
      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={slider}
          onChange={(e) => handleSlider(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-bg-3
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(46,163,242,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${pct}%, var(--color-bg-3) ${pct}%, var(--color-bg-3) 100%)`,
          }}
        />
      </div>

      {/* 快捷金额 */}
      <div className="flex gap-2 flex-wrap">
        {quickAmounts.map((amt) => (
          <button
            key={amt}
            onClick={() => {
              onChange(amt);
              setSlider(amt);
            }}
            disabled={disabled}
            className={clsx(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
              value === amt
                ? "border-primary bg-primary/20 text-primary"
                : "border-line text-text-2 hover:border-line-light hover:text-text-1",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {amt >= 1000 ? `${amt / 1000}k` : amt}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(max);
            setSlider(max);
          }}
          disabled={disabled}
          className="ml-auto"
        >
          最大
        </Button>
      </div>
    </div>
  );
}
