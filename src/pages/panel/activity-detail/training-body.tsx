import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("activity.duration")} value={formatDuration(seconds)} />
        <StatTile label={t("activity.distance")} value={`${km.toFixed(2)} ${t("body.km")}`} />
        <StatTile label={t("activity.avg_pace")} value={formatPace(paceSecPerKm, t)} />
        <StatTile label={t("activity.track_points")} value={String(training.track?.length ?? 0)} />
      </div>
      {training.track && training.track.length >= 2 ? (
        <RouteMap track={training.track} highlight={highlight} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("activity.no_route")}
          </CardContent>
        </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>{t("activity.splits")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {splits.map((split) => (
          <div key={split.index} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              {split.km < 1
                ? `${split.km.toFixed(2)} ${t("body.km")}`
                : t("activity.km_label", { n: split.index })}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${fractionOf(split.paceSecPerKm) * 100}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-sm font-semibold">
              {formatPace(split.paceSecPerKm, t)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
