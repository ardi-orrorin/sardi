"use client";

import { useMemo } from "react";

type NumberDropdownTone = "teal" | "cyan";

type NumberDropdownProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  tone?: NumberDropdownTone;
  className?: string;
  disabled?: boolean;
  onChange: (nextValue: number) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toSafeInt = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.trunc(value);
};

const getToneClasses = (tone: NumberDropdownTone) => {
  if (tone === "teal") {
    return {
      button: "border-teal-200/35 bg-teal-900/35 text-teal-50 hover:bg-teal-800/45",
      select: "border-teal-100/20 bg-teal-950/30 text-teal-50",
      icon: "text-teal-100/70"
    };
  }

  return {
    button: "border-cyan-200/35 bg-cyan-900/35 text-cyan-50 hover:bg-cyan-800/45",
    select: "border-cyan-100/20 bg-cyan-950/30 text-cyan-50",
    icon: "text-cyan-100/70"
  };
};

export function NumberDropdown({
  value,
  min,
  max,
  step = 1,
  tone = "teal",
  className = "",
  disabled = false,
  onChange
}: NumberDropdownProps) {
  const safeMin = useMemo(() => Math.min(toSafeInt(min, 0), toSafeInt(max, 0)), [max, min]);
  const safeMax = useMemo(() => Math.max(toSafeInt(min, 0), toSafeInt(max, 0)), [max, min]);
  const safeStep = Math.max(toSafeInt(step, 1), 1);
  const current = clamp(toSafeInt(value, safeMin), safeMin, safeMax);

  const options = useMemo(() => {
    const list: number[] = [];
    for (let next = safeMin; next <= safeMax; next += safeStep) {
      list.push(next);
    }
    if (list.length === 0 || list[list.length - 1] !== safeMax) {
      list.push(safeMax);
    }
    return list;
  }, [safeMax, safeMin, safeStep]);

  const toneClasses = getToneClasses(tone);

  const updateValue = (nextValue: number) => {
    if (disabled) {
      return;
    }
    onChange(clamp(nextValue, safeMin, safeMax));
  };

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={() => updateValue(current - safeStep)}
        disabled={disabled || current <= safeMin}
        className={`h-10 w-10 shrink-0 rounded-lg border text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClasses.button}`}
      >
        -
      </button>

      <div className="relative min-w-0 flex-1">
        <select
          value={String(current)}
          disabled={disabled}
          onChange={(event) => updateValue(Number(event.target.value))}
          className={`h-10 w-full appearance-none rounded-lg border px-3 pr-8 text-sm disabled:cursor-not-allowed disabled:opacity-45 ${toneClasses.select}`}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${toneClasses.icon}`}>▼</span>
      </div>

      <button
        type="button"
        onClick={() => updateValue(current + safeStep)}
        disabled={disabled || current >= safeMax}
        className={`h-10 w-10 shrink-0 rounded-lg border text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClasses.button}`}
      >
        +
      </button>
    </div>
  );
}
