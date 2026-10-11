import { useTranslation } from "react-i18next";
import { BASAL_MAX_RATE } from "@/lib/basal";
import { cn } from "@/lib/utils";

const HOURS = 24;
const MIN_TOP = 0.5;
const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/**
 * The 24 hourly rates as one continuous step line over a light fill. With
 * `onSelectHour` each hour is a button and the selected one is highlighted.
 */
export function BasalStepChart({
  rates,
  height,
  selectedHour,
  onSelectHour,
}: {
  rates: number[];
  height: number;
  selectedHour?: number;
  onSelectHour?: (hour: number) => void;
}) {
  const { t } = useTranslation();
  const top = Math.min(Math.max(...rates, MIN_TOP) * 1.15, BASAL_MAX_RATE);
  const level = (rate: number) => 100 - (rate / top) * 100;
  const line = rates.map((rate, hour) => `${hour === 0 ? "M" : "V"}${level(rate)} H${hour + 1}`).join(" ").replace(/^M/, "M0,");
  const interactive = onSelectHour !== undefined;
  return (
    <div>
      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${HOURS} 100`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          {selectedHour !== undefined && <rect x={selectedHour} y={0} width={1} height={100} fill="var(--brand)" fillOpacity={0.14} />}
          <path d={`${line} V100 H0 Z`} fill="var(--brand)" fillOpacity={0.14} />
          <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {interactive && (
          <div className="absolute inset-0 grid grid-cols-24">
            {rates.map((_, hour) => (
              <button
                key={hour}
                type="button"
                aria-label={`${String(hour).padStart(2, "0")}:00`}
                aria-pressed={hour === selectedHour}
                onClick={() => onSelectHour(hour)}
                className={cn("rounded-sm hover:bg-brand/8", hour === selectedHour && "bg-transparent")}
              />
            ))}
          </div>
        )}
      </div>
      {interactive && (
        <div className="relative mt-2 h-4 text-[11px] text-label" aria-label={t("basal.title")}>
          {HOUR_LABELS.map((hour) => (
            <span
              key={hour}
              className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${(hour / HOURS) * 100}%` }}
            >
              {String(hour).padStart(2, "0")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
