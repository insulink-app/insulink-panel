import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { TimeInRangeCard } from "@/pages/panel/overview/glucose-cards";
import { CalendarHeatmap, tirColor } from "@/components/calendar-heatmap";
import glucoseService, {
  type GlucoseEntry,
} from "@/api/services/glucose-service";
import settingsService from "@/api/services/settings-service";
import {
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  dailyTimeInRange,
  summaryStats,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";

// The panel's mirror of the app's analysis "averages" + "calendar" tabs: the
// clinical glucose summary (mean, GMI, CV, SD, extremes), the range breakdown,
// and a daily time-in-range calendar over the whole stored history.
export default function StatisticsPage() {
  const { t } = useTranslation();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
  });

  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;
  const entries = useMemo<GlucoseEntry[]>(() => data?.entries ?? [], [data]);

  const summary = useMemo(
    () => summaryStats(entries.map((entry) => entry.value), low, high),
    [entries, low, high],
  );
  const tirByDay = useMemo(
    () => dailyTimeInRange(entries, low, high),
    [entries, low, high],
  );

  const reading = (mgdl: number | undefined) =>
    mgdl == null ? "–" : `${toDisplay(mgdl, unit)} ${unitLabel(unit)}`;

  return (
    <PanelPage title={t("statistics.title")}>
      <div className="py-6 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("statistics.summary")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile
              label={t("statistics.average")}
              value={reading(summary?.mean)}
            />
            <StatTile
              label={t("statistics.gmi")}
              value={summary ? `${summary.gmi.toFixed(1)} %` : "–"}
              hint={t("statistics.gmi_hint")}
            />
            <StatTile
              label={t("statistics.cv")}
              value={summary ? `${summary.cv.toFixed(1)} %` : "–"}
              hint={t("statistics.cv_hint")}
            />
            <StatTile
              label={t("statistics.sd")}
              value={reading(summary?.sd)}
              hint={t("statistics.sd_hint")}
            />
            <StatTile label={t("statistics.min")} value={reading(summary?.min)} />
            <StatTile label={t("statistics.max")} value={reading(summary?.max)} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <TimeInRangeCard
            entries={entries}
            low={low}
            high={high}
            unit={unit}
            isLoading={isLoading}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t("statistics.calendar")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CalendarHeatmap
                values={tirByDay}
                color={tirColor}
                tooltip={(fraction) =>
                  `${Math.round(fraction * 100)} % ${t("statistics.in_range")}`
                }
              />
              <CalendarLegend />
            </CardContent>
          </Card>
        </div>
      </div>
    </PanelPage>
  );
}

// The four-bucket TIR colour key under the calendar.
function CalendarLegend() {
  const { t } = useTranslation();
  const buckets: { fraction: number; label: string }[] = [
    { fraction: 0.8, label: t("statistics.legend_good") },
    { fraction: 0.6, label: t("statistics.legend_ok") },
    { fraction: 0.4, label: t("statistics.legend_fair") },
    { fraction: 0.1, label: t("statistics.legend_poor") },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
      {buckets.map((bucket) => (
        <span
          key={bucket.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="size-3 rounded-[3px]"
            style={{ backgroundColor: tirColor(bucket.fraction) }}
          />
          {bucket.label}
        </span>
      ))}
    </div>
  );
}
