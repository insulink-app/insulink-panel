import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { GlucoseTrendArrow } from "@/components/glucose-trend-arrow";
import { Skeleton } from "@/components/ui/skeleton";
import type { GlucoseEntry } from "@/api/services/glucose-service";
import {
  classify,
  statusColorVar,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";
import { StatusChip } from "@/components/status-chip";
import { formatNumber } from "@/lib/format";
import { trendPerMinute } from "@/lib/glucose-trend";

// The rate carries a sign and one decimal: rounding it the way `toDisplay`
// rounds a reading would flatten a 1.4 mg/dL per minute rise to "1".
function formatRate(perMin: number, unit?: string) {
  const rate = unit === "mmol" ? perMin / 18 : perMin;
  const digits = unit === "mmol" ? 2 : 1;
  return `${rate >= 0 ? "+" : "−"}${formatNumber(Math.abs(rate), digits)}`;
}

/**
 * The latest reading as a hero row: the value (72 or 80 px), its trend
 * arrow in a circle tinted by the range, and the unit over the rate and time.
 */
function CurrentReading({
  entries,
  unit,
  color,
  size,
  isLoading,
}: {
  entries: GlucoseEntry[];
  unit?: string;
  /** The latest reading's range colour, for the arrow's circle. */
  color: string;
  size: number;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const latest = entries[entries.length - 1];
  const perMinute = trendPerMinute(entries);

  if (isLoading) {
    return <Skeleton className="h-16 w-64" />;
  }
  return (
    <div className="flex items-center gap-3.5">
      <b className="leading-[0.9] font-extrabold tracking-[-0.045em]" style={{ fontSize: size }}>
        {latest ? toDisplay(latest.value, unit) : "–"}
      </b>
      {perMinute !== undefined && (
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          <GlucoseTrendArrow perMin={perMinute} color={color} size={20} />
        </span>
      )}
      <span className="text-sm leading-[1.45] text-muted-foreground">
        <b className="text-foreground">{unitLabel(unit)}</b>
        {latest && (
          <>
            <br />
            {perMinute !== undefined && `${t("overview.per_min", { value: formatRate(perMinute, unit) })} · `}
            {format(new Date(latest.time), "HH:mm")}
          </>
        )}
      </span>
    </div>
  );
}

/** The latest reading with its range chip, standing open in a row. */
export function GlucoseHero({
  entries,
  low,
  high,
  unit,
  size = 72,
  isLoading,
}: {
  entries: GlucoseEntry[];
  low: number;
  high: number;
  unit?: string;
  size?: number;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const latest = entries[entries.length - 1];
  const status = latest ? classify(latest.value, low, high) : "in-range";
  const color = statusColorVar[status];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <CurrentReading entries={entries} unit={unit} color={color} size={size} isLoading={isLoading} />
      {latest && !isLoading && (
        <StatusChip color={color}>{t("overview.status_" + status.replace("-", "_"))}</StatusChip>
      )}
    </div>
  );
}
