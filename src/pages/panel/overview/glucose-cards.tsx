import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GlucoseEntry } from "@/api/services/glucose-service";
import {
  bandColorVar,
  bandRange,
  classify,
  classifyBand,
  GLUCOSE_BANDS,
  toDisplay,
  unitLabel,
  type GlucoseBand,
} from "@/lib/glucose";
import { useGlucoseHex } from "@/lib/use-glucose-hex";

// Trend arrow buckets (mg/dL per minute), mirroring the app's 5 directions.
// Colour comes from `currentColor` (set on the wrapper) so it can't fall foul
// of how lucide maps the `color` prop.
function TrendArrow({ perMin, color }: { perMin: number; color: string }) {
  const Icon =
    perMin >= 2
      ? ArrowUp
      : perMin >= 1
        ? ArrowUpRight
        : perMin > -1
          ? ArrowRight
          : perMin > -2
            ? ArrowDownRight
            : ArrowDown;
  return (
    <span style={{ color }}>
      <Icon size={34} strokeWidth={2.5} />
    </span>
  );
}

// The rate carries a sign and one decimal — rounding it the way `toDisplay`
// rounds a reading would flatten a 1.4 mg/dL per minute rise to "1".
function formatRate(perMin: number, unit?: string) {
  const rate = unit === "mmol" ? perMin / 18 : perMin;
  const digits = unit === "mmol" ? 2 : 1;
  return `${rate >= 0 ? "+" : "−"}${Math.abs(rate).toFixed(digits)}`;
}

// Slope against a reading 1–60 min before the latest (scan back so odd
// spacing/duplicate timestamps at the tail don't drop the arrow); fall back to
// the immediately previous reading if nothing lands in-window.
function trendPerMinute(entries: GlucoseEntry[]) {
  const latest = entries[entries.length - 1];
  if (!latest || entries.length < 2) {
    return undefined;
  }
  const previous =
    [...entries].reverse().find((entry) => {
      const minutesApart = (latest.time - entry.time) / 60000;
      return minutesApart >= 1 && minutesApart <= 60;
    }) ?? entries[entries.length - 2];
  if (latest.time === previous.time) {
    return undefined;
  }
  return (
    (latest.value - previous.value) / ((latest.time - previous.time) / 60000)
  );
}

/**
 * The latest reading with its trend arrow, sized to sit in the history card's
 * header rather than in a card of its own.
 */
export function CurrentReading({
  entries,
  low,
  high,
  unit,
  isLoading,
}: {
  entries: GlucoseEntry[];
  low: number;
  high: number;
  unit?: string;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const hex = useGlucoseHex();
  const latest = entries[entries.length - 1];
  const color = hex[latest ? classify(latest.value, low, high) : "in-range"];
  const perMinute = trendPerMinute(entries);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-16 w-48" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("overview.current_glucose")}
      </span>
      {/* The trend and the unit stack to the reading's own height, so the three
          share one baseline block instead of trailing off to the right. */}
      <div className="flex items-stretch gap-3">
        <span
          className="text-7xl font-bold leading-none"
          style={latest ? { color } : undefined}
        >
          {latest ? toDisplay(latest.value, unit) : "–"}
        </span>
        <div className="flex flex-col items-start">
          {perMinute !== undefined && (
            <span className="flex flex-col items-start">
              <TrendArrow perMin={perMinute} color={color} />
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {t("overview.per_min", { value: formatRate(perMinute, unit) })}
              </span>
            </span>
          )}
          <span className="text-[10px] font-medium text-muted-foreground">
            {unitLabel(unit)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** The latest reading's range as a coloured pill. */
export function StatusBadge({
  entries,
  low,
  high,
}: {
  entries: GlucoseEntry[];
  low: number;
  high: number;
}) {
  const { t } = useTranslation();
  const hex = useGlucoseHex();
  const latest = entries[entries.length - 1];
  if (!latest) {
    return null;
  }
  const status = classify(latest.value, low, high);
  const color = hex[status];
  const label: Record<string, string> = {
    low: t("overview.status_low"),
    "in-range": t("overview.status_in_range"),
    high: t("overview.status_high"),
  };
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
      }}
    >
      {label[status]}
    </span>
  );
}

/** The five glucose bands as a vertical stack, high at the top. */
export function TimeInRangeCard({
  entries,
  low,
  high,
  unit,
  isLoading,
}: {
  entries: GlucoseEntry[];
  low: number;
  high: number;
  unit?: string;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const counts: Record<GlucoseBand, number> = {
    "very-low": 0,
    low: 0,
    "in-range": 0,
    high: 0,
    "very-high": 0,
  };
  for (const entry of entries) {
    counts[classifyBand(entry.value, low, high)]++;
  }
  const percent = (band: GlucoseBand) =>
    entries.length ? (counts[band] / entries.length) * 100 : 0;

  return (
    <Card className="h-full">
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("overview.time_in_range")}
          </span>
          {isLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <span className="text-5xl font-bold leading-none">
              {Math.round(percent("in-range"))}
              <span className="ml-1 text-xl font-semibold text-muted-foreground">
                %
              </span>
            </span>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-full min-h-40 w-full" />
        ) : (
          <div className="flex flex-1 gap-4">
            <div className="flex w-10 flex-col overflow-hidden rounded-lg bg-secondary">
              {GLUCOSE_BANDS.map((band) => (
                <div
                  key={band}
                  style={{
                    height: `${percent(band)}%`,
                    backgroundColor: bandColorVar[band],
                  }}
                />
              ))}
            </div>
            <div className="flex flex-1 flex-col justify-between gap-2">
              {GLUCOSE_BANDS.map((band) => (
                <BandRow
                  key={band}
                  band={band}
                  percent={percent(band)}
                  range={bandRange(band, low, high, unit)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BandRow({
  band,
  percent,
  range,
}: {
  band: GlucoseBand;
  percent: number;
  range: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span
        className="size-2.5 shrink-0 rounded-[3px]"
        style={{ backgroundColor: bandColorVar[band] }}
      />
      <span className="flex flex-1 flex-col">
        {t("overview.band_" + band.replace("-", "_"))}
        <span className="text-xs tabular-nums text-muted-foreground">
          {range}
        </span>
      </span>
      <span className="font-semibold text-lg tabular-nums">{Math.round(percent)} %</span>
    </div>
  );
}
