import { useTranslation } from "react-i18next";
import { GlucoseTrendArrow } from "@/components/glucose-trend-arrow";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GlucoseEntry } from "@/api/services/glucose-service";
import {
  bandColorVar,
  bandRange,
  classifyBand,
  GLUCOSE_BANDS,
  toDisplay,
  unitLabel,
  type GlucoseBand,
} from "@/lib/glucose";
import { formatNumber } from "@/lib/format";
import { trendPerMinute } from "@/lib/glucose-trend";

// The rate carries a sign and one decimal: rounding it the way `toDisplay`
// rounds a reading would flatten a 1.4 mg/dL per minute rise to "1".
function formatRate(perMin: number, unit?: string) {
  const rate = unit === "mmol" ? perMin / 18 : perMin;
  const digits = unit === "mmol" ? 2 : 1;
  return `${rate >= 0 ? "+" : "−"}${formatNumber(Math.abs(rate), digits)}`;
}

/** The latest reading, 64 px, with its trend arrow, unit and rate. */
export function CurrentReading({
  entries,
  unit,
  isLoading,
}: {
  entries: GlucoseEntry[];
  unit?: string;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const latest = entries[entries.length - 1];
  const perMinute = trendPerMinute(entries);

  return (
    <div>
      <span className="text-sm text-muted-foreground">{t("overview.current_glucose")}</span>
      {isLoading ? (
        <Skeleton className="mt-1 h-16 w-48" />
      ) : (
        <div className="mt-1 flex items-center gap-2.5">
          <b className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">
            {latest ? toDisplay(latest.value, unit) : "–"}
          </b>
          {perMinute !== undefined && <GlucoseTrendArrow perMin={perMinute} color="var(--text)" size={40} />}
          <span className="ml-1 text-sm leading-snug text-muted-foreground">
            {unitLabel(unit)}
            {perMinute !== undefined && (
              <>
                <br />
                {t("overview.per_min", { value: formatRate(perMinute, unit) })}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/** The five glucose bands as a vertical stacked bar beside their list. */
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
  const counts: Record<GlucoseBand, number> = { "very-low": 0, low: 0, "in-range": 0, high: 0, "very-high": 0 };
  for (const entry of entries) {
    counts[classifyBand(entry.value, low, high)]++;
  }
  const percent = (band: GlucoseBand) => (entries.length ? (counts[band] / entries.length) * 100 : 0);

  return (
    <Card className="h-full gap-0 p-6">
      <span className="text-sm text-muted-foreground">{t("overview.time_in_range")}</span>
      {isLoading ? (
        <Skeleton className="mt-1 h-12 w-24" />
      ) : (
        <div className="mt-1">
          <b className="text-5xl leading-none font-extrabold tracking-[-0.04em]">{Math.round(percent("in-range"))}</b>
          <span className="text-xl font-bold text-muted-foreground"> %</span>
        </div>
      )}
      <div className="mt-5 flex flex-1 gap-[18px]">
        <div className="flex min-h-[260px] w-7 flex-col gap-[3px]" aria-hidden>
          {GLUCOSE_BANDS.filter((band) => percent(band) > 0).map((band) => (
            <i
              key={band}
              className="block min-h-1.5 rounded-md"
              style={{ flexGrow: percent(band), backgroundColor: bandColorVar[band] }}
            />
          ))}
        </div>
        <div className="flex-1 divide-y divide-divider">
          {GLUCOSE_BANDS.map((band) => (
            <div key={band} className="flex items-center gap-2.5 py-3">
              <i className="block size-2 shrink-0 rounded-full" style={{ backgroundColor: bandColorVar[band] }} />
              <span className="min-w-0 flex-1">
                <b className="block text-sm">{t("overview.band_" + band.replace("-", "_"))}</b>
                <span className="text-xs text-muted-foreground">{bandRange(band, low, high, unit)}</span>
              </span>
              <b className="text-[15px]">{Math.round(percent(band))} %</b>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
