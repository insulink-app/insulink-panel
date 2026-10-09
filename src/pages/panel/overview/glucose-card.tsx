import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/segmented";
import { GlucoseLineChart, type GlucoseChartRow } from "@/components/glucose-line-chart";
import type { GlucoseEntry, GlucosePredictionResponse } from "@/api/services/glucose-service";
import { HOUR } from "@/lib/use-time-window";
import { GlucoseHero } from "@/components/glucose-hero";

const RANGE_HOURS = [3, 6, 12, 24];
const CHART_HEIGHT = 280;

// The forecast rows, anchored at the latest reading so the dashed line starts
// on the curve. Points at or before that reading are dropped: a stale forecast
// (its refresh failed) would otherwise double back over the real readings.
function forecastRows(
  prediction: GlucosePredictionResponse | undefined,
  latest: GlucoseEntry | undefined,
): GlucoseChartRow[] {
  const base = prediction?.generated_at;
  if (!prediction?.curve?.length || base == null || !latest) {
    return [];
  }
  return prediction.curve
    .map((point) => ({ time: base + point.offset_min * 60000, predicted: point.mgdl }))
    .filter((row) => row.time > latest.time);
}

/**
 * The latest reading with its trend and range, over the glucose curve of the
 * chosen span and the forecast beyond it.
 */
export function GlucoseCard({
  entries,
  low,
  high,
  unit,
  prediction,
  isLoading,
}: {
  entries: GlucoseEntry[];
  low: number;
  high: number;
  unit?: string;
  prediction?: GlucosePredictionResponse;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const [rangeHours, setRangeHours] = useState(24);
  const latest = entries[entries.length - 1];
  const start = (latest?.time ?? Date.now()) - rangeHours * HOUR;

  const readings: GlucoseChartRow[] = entries
    .filter((entry) => entry.time >= start)
    .map((entry) => ({ time: entry.time, value: entry.value }));
  const forecast = forecastRows(prediction, latest);
  if (forecast.length > 0 && readings.length > 0) {
    readings[readings.length - 1] = { ...readings[readings.length - 1], predicted: latest.value };
  }
  const rows = [...readings, ...forecast];
  const end = rows[rows.length - 1]?.time ?? Date.now();

  return (
    <Card className="h-full gap-0 p-6">
      <div className="mb-[26px] flex flex-wrap items-center justify-between gap-4">
        <GlucoseHero entries={entries} low={low} high={high} unit={unit} isLoading={isLoading} />
        <Segmented
          label={t("overview.range")}
          value={rangeHours}
          onChange={setRangeHours}
          options={RANGE_HOURS.map((hours) => ({ value: hours, label: t("common.range_hours", { n: hours }) }))}
        />
      </div>
      {isLoading ? (
        <Skeleton className="w-full rounded-2xl" style={{ height: CHART_HEIGHT }} />
      ) : rows.length === 0 ? (
        <p className="grid place-items-center text-sm text-muted-foreground" style={{ height: CHART_HEIGHT }}>
          {t("common.no_data")}
        </p>
      ) : (
        <GlucoseLineChart
          rows={rows}
          low={low}
          high={high}
          unit={unit}
          start={start}
          end={end}
          nowTime={latest?.time}
          height={CHART_HEIGHT}
        />
      )}
    </Card>
  );
}
