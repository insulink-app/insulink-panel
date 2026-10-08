import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { StatStrip } from "@/components/stat-strip";
import { formatNumber } from "@/lib/format";
import { RouteMap } from "@/components/route-map";
import type { Training } from "@/api/services/sport-service";
import { kmSplits, type KmSplit } from "./splits";
import { formatDuration, formatPace } from "./format";

export function TrainingBody({
  training,
  highlight,
  chart,
}: {
  training: Training;
  highlight?: { lat: number; lng: number } | null;
  // The glucose/pulse chart, rendered between the map and the km splits.
  chart?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const seconds = Math.max(0, Math.round((training.end - training.start) / 1000));
  const km = training.dist / 1000;
  // Average pace in seconds per kilometre — the app's per-km metric.
  const paceSecPerKm = km > 0 ? seconds / km : 0;
  // Walks the whole track, and `highlight` changes on every hover — so memoise.
  const splits = useMemo(() => kmSplits(training.track ?? []), [training.track]);

  return (
    <div className="flex flex-col gap-4">
      <StatStrip
        cells={[
          { label: t("activity.duration"), value: formatDuration(seconds) },
          { label: t("activity.distance"), value: formatNumber(km, 2), unit: t("body.km") },
          { label: t("activity.avg_pace"), value: formatPace(paceSecPerKm, t) },
          { label: t("activity.track_points"), value: formatNumber(training.track?.length ?? 0) },
        ]}
      />
      {training.track && training.track.length >= 2 ? (
        <RouteMap track={training.track} highlight={highlight} />
      ) : (
        <Card className="p-6 text-center text-sm text-muted-foreground">{t("activity.no_route")}</Card>
      )}
      {chart}
      <SplitsPanel splits={splits} />
    </div>
  );
}

// Per-kilometre pace list: one row per km with a bar scaled to that km's pace
// relative to the run's fastest/slowest, mirroring the app's splits panel.
function SplitsPanel({ splits }: { splits: KmSplit[] }) {
  const { t } = useTranslation();
  if (splits.length === 0) {
    return null;
  }
  const paces = splits.map((split) => split.paceSecPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const span = slowest - fastest;
  // Bar fill 0.35..1.0, longest for the fastest km (shortest pace).
  const fractionOf = (pace: number) => (span === 0 ? 1 : 0.35 + 0.65 * (1 - (pace - fastest) / span));

  return (
    <Card className="gap-4 p-6">
      <CardHeading title={t("activity.splits")} />
      <div className="flex flex-col gap-3">
        {splits.map((split) => (
          <div key={split.index} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              {split.km < 1
                ? `${formatNumber(split.km, 2)} ${t("body.km")}`
                : t("activity.km_label", { n: split.index })}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-divider">
              <div
                className="h-full bg-primary"
                style={{ width: `${fractionOf(split.paceSecPerKm) * 100}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-sm font-bold">
              {formatPace(split.paceSecPerKm, t)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
