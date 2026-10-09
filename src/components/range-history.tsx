import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ChevronRight } from "@/components/icons";
import { formatNumber } from "@/lib/format";
import { formatDay } from "@/lib/when";

export interface HistoryReading {
  time: number;
  value: number;
}

/**
 * How a history shows its values: the unit, the band that counts as normal,
 * the span the strip covers, and how a value is written and coloured.
 */
export interface HistoryScale {
  unit: string;
  band: [number, number];
  domain: [number, number];
  /** Written value, already in the display unit. */
  format: (value: number) => string;
  /** The dot's colour for a value. */
  color: (value: number) => string;
  /** A status word after the value, only for values out of range. */
  flag?: (value: number) => { label: string; color: string } | null;
  /** The change to the reading before, in the display unit. */
  change: (value: number, previous: number) => number;
  changeDigits?: number;
}

const PAGE = 12;

/**
 * A history as day groups instead of a date/value table: each row has its
 * time, the value, a range strip whose dot stands where the value lies against
 * the normal band (so the dots read as a small vertical chart) and the change
 * to the reading before. `readings` arrive newest first.
 */
export function RangeHistory({
  readings,
  scale,
  olderLabel,
  intervalHint = true,
}: {
  readings: HistoryReading[];
  scale: HistoryScale;
  olderLabel: string;
  /** Show the typical spacing ("alle 5 Minuten") beside each day. */
  intervalHint?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(PAGE);
  const [min, max] = scale.domain;
  const position = (value: number) => Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const shown = readings.slice(0, visible);
  const groups = new Map<string, { time: number; index: number }[]>();
  shown.forEach((reading, index) => {
    const key = format(new Date(reading.time), "yyyy-MM-dd");
    groups.set(key, [...(groups.get(key) ?? []), { time: reading.time, index }]);
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2.5 flex items-center gap-3.5 text-[11px] text-label">
        <span className="w-11">{t("glucose.col_time")}</span>
        <span className="w-[150px]">{t("glucose.col_value")}</span>
        <span className="relative mx-3 hidden h-3.5 flex-1 sm:block">
          <span className="absolute -translate-x-1/2" style={{ left: `${position(scale.band[0])}%` }}>
            {scale.format(scale.band[0])}
          </span>
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${position(scale.band[1])}%` }}>
            {scale.format(scale.band[1])} {scale.unit}
          </span>
        </span>
        <span className="ml-auto w-16 text-right">{t("common.col_change")}</span>
      </div>
      {[...groups.values()].map((group) => (
        <section key={group[0].time} className="mb-1">
          <div className="mb-1.5 flex items-baseline gap-2">
            <h3 className="text-[13px] font-extrabold">{formatDay(group[0].time, t, i18n.language)}</h3>
            {intervalHint && group.length > 1 && (
              <span className="text-xs text-label">
                {t("common.every_minutes", { n: Math.round((group[0].time - group[1].time) / 60_000) })}
              </span>
            )}
          </div>
          {group.map(({ index }) => (
            <HistoryRow
              key={readings[index].time}
              reading={readings[index]}
              previous={readings[index + 1]}
              scale={scale}
            />
          ))}
        </section>
      ))}
      {visible < readings.length && (
        <div className="mt-auto border-t border-divider pt-3.5 text-center">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE)}
            className="inline-flex items-center gap-1 rounded-md text-[13px] font-bold text-brand-text hover:underline"
          >
            {olderLabel}
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  reading,
  previous,
  scale,
}: {
  reading: HistoryReading;
  previous?: HistoryReading;
  scale: HistoryScale;
}) {
  const flag = scale.flag?.(reading.value);
  const change = previous ? scale.change(reading.value, previous.value) : null;
  return (
    <div className="flex min-h-[46px] items-center gap-3.5">
      <span className="w-11 shrink-0 text-[13px] font-bold text-muted-foreground">
        {format(new Date(reading.time), "HH:mm")}
      </span>
      <span className="w-[150px] shrink-0 truncate">
        <b className="text-[15px] font-extrabold">{scale.format(reading.value)}</b>{" "}
        <span className="text-xs text-muted-foreground">{scale.unit}</span>
        {flag && (
          <span className="text-xs font-bold" style={{ color: flag.color }}>
            {" · "}
            {flag.label}
          </span>
        )}
      </span>
      <span className="mx-3 hidden min-w-0 flex-1 sm:block">
        <RangeStrip
          value={reading.value}
          band={scale.band}
          domain={scale.domain}
          color={scale.color(reading.value)}
        />
      </span>
      <span className="ml-auto w-16 shrink-0 text-right text-[13px] text-muted-foreground">
        {change != null && change !== 0 && (
          <span className="inline-flex items-center gap-1">
            {change > 0 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
            {formatNumber(Math.abs(change), scale.changeDigits ?? 0)}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * A 6 px track with the normal band lit and the value as a ringed dot, so a
 * column of strips reads as a small vertical chart.
 */
export function RangeStrip({
  value,
  band,
  domain,
  color,
}: {
  value: number;
  band: [number, number];
  domain: [number, number];
  color: string;
}) {
  const [min, max] = domain;
  const position = (point: number) => Math.min(100, Math.max(0, ((point - min) / (max - min)) * 100));
  return (
    <span className="relative block h-1.5 rounded-[3px] bg-ground" aria-hidden>
      <i
        className="absolute inset-y-0 rounded-[3px] bg-foreground/10"
        style={{ left: `${position(band[0])}%`, width: `${position(band[1]) - position(band[0])}%` }}
      />
      <i
        className="absolute -top-[3px] size-3 rounded-full ring-[3px] ring-panel"
        style={{ left: `calc(${position(value)}% - 6px)`, backgroundColor: color }}
      />
    </span>
  );
}
