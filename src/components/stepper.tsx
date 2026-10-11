import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "@/components/icons";
import { formatNumber, parseNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A value between round − and + buttons, with its unit beside it. The value
 * can also be typed; it is read on blur or Enter and kept inside `min`/`max`.
 * Value and unit never wrap: the field grows with its content instead.
 */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  digits = 0,
  unit,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  digits?: number;
  unit?: string;
  /** What the value is, for the buttons' and the field's accessible names. */
  label: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string>();
  const shown = draft ?? formatNumber(value, digits);
  const clamp = (next: number) => Math.min(max, Math.max(min, Number(next.toFixed(Math.max(digits, 2)))));
  const commit = () => {
    const parsed = draft === undefined ? null : parseNumber(draft);
    if (parsed !== null) {
      onChange(clamp(parsed));
    }
    setDraft(undefined);
  };
  const button = "grid size-9 shrink-0 place-items-center rounded-full bg-panel text-foreground transition-colors hover:bg-raised-strong disabled:opacity-40";
  return (
    <div className={cn("inline-flex h-11 items-center gap-1 rounded-full bg-ground p-1", className)}>
      <button
        type="button"
        className={button}
        aria-label={t("settings.decrease", { label })}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <label className="flex min-w-[88px] items-baseline justify-center gap-1 px-2 whitespace-nowrap">
        <input
          inputMode="decimal"
          aria-label={label}
          value={shown}
          size={Math.max(shown.length, 2)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit();
            }
          }}
          className="field-sizing-content min-w-[2ch] appearance-none rounded border-0 bg-transparent p-0 text-right text-base font-extrabold shadow-none outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        {unit && <span className="text-xs font-bold text-muted-foreground">{unit}</span>}
      </label>
      <button
        type="button"
        className={button}
        aria-label={t("settings.increase", { label })}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
