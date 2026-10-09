import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import { Download } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { KpiStrip } from "@/components/kpi-strip";
import { GlucoseHero } from "@/components/glucose-hero";
import { GlucoseLineChart } from "@/components/glucose-line-chart";
import { TimeWindowBar } from "@/components/time-window";
import { TimeInRangeCard } from "@/components/time-in-range-card";
import { RangeHistory, type HistoryScale } from "@/components/range-history";
import { DAY, useTimeWindow, useWindowedData, type TimeWindow } from "@/lib/use-time-window";
import { formatNumber } from "@/lib/format";
import glucoseService, { type GlucoseEntry } from "@/api/services/glucose-service";
import settingsService from "@/api/services/settings-service";
import {
  classify,
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  statusColorVar,
  summaryStats,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";
import { SensorCard } from "./sensor-card";

// Where the history strip starts and ends, in mg/dL.
const STRIP_DOMAIN: [number, number] = [40, 260];

export default function GlucosePage() {
  const { t } = useTranslation();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });
  const { data, isLoading } = useQuery({ queryKey: ["glucose-history"], queryFn: glucoseService.history });

  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;

  const ascending = useMemo(
    () => (data?.entries ?? []).slice().sort((left, right) => left.time - right.time),
    [data],
  );
  const latest = ascending[ascending.length - 1]?.time ?? Date.now();
  const window = useTimeWindow(latest, ascending[0]?.time ?? latest);
  const windowData = useWindowedData(ascending, (entry) => entry.time, window);
  const stats = summaryStats(windowData.map((entry) => entry.value), low, high);
  const descending = useMemo(() => ascending.slice().reverse(), [ascending]);
  const period = periodLabel(window, t);

  const scale: HistoryScale = {
    unit: unitLabel(unit),
    band: [low, high],
    domain: STRIP_DOMAIN,
    format: (value) => toDisplay(value, unit),
    color: (value) => statusColorVar[classify(value, low, high)],
    flag: (value) => {
      const status = classify(value, low, high);
      return status === "in-range" ? null : { label: t("glucose.status_" + status), color: statusColorVar[status] };
    },
    change: (value, previous) => (unit === "mmol" ? (value - previous) / 18 : value - previous),
    changeDigits: unit === "mmol" ? 1 : 0,
  };

  return (
    <PanelPage title={t("glucose.title")}>
      <PageHeader title={t("glucose.title")} />
      <div className="mb-6 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <GlucoseHero entries={ascending} low={low} high={high} unit={unit} size={80} isLoading={isLoading} />
        <KpiStrip
          cells={[
            { label: t("glucose.minimum"), value: stats ? toDisplay(stats.min, unit) : "–", unit: unitLabel(unit) },
            { label: t("glucose.average"), value: stats ? toDisplay(stats.mean, unit) : "–", unit: unitLabel(unit) },
            { label: t("glucose.maximum"), value: stats ? toDisplay(stats.max, unit) : "–", unit: unitLabel(unit) },
            { label: t("glucose.in_range"), value: stats ? formatNumber(stats.tir) : "–", unit: "%" },
          ]}
        />
      </div>

      <Card className="mb-4 gap-0 p-6">
        <TimeWindowBar window={window} />
        <div className="mt-6">
          {windowData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
          ) : (
            <GlucoseLineChart
              rows={windowData.map((entry: GlucoseEntry) => ({ time: entry.time, value: entry.value }))}
              low={low}
              high={high}
              unit={unit}
              start={window.start}
              end={window.end}
              nowTime={window.atLatest ? windowData[windowData.length - 1].time : undefined}
              height={330}
              tickFormat={window.rangeMs > DAY ? "dd.MM." : "HH:mm"}
            />
          )}
        </div>
      </Card>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Card className="gap-0 p-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="flex-1 text-lg font-extrabold">
              {t("glucose.readings")}
              <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(ascending.length)}</span>
            </h2>
            <Button asChild variant="outline" size="sm" className="h-9 border border-line bg-panel px-4 text-sm">
              <Link to="/export/">
                <Download className="size-4" />
                {t("common.export")}
              </Link>
            </Button>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <RangeHistory readings={descending} scale={scale} olderLabel={t("glucose.older")} />
          )}
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <TimeInRangeCard
            entries={windowData}
            low={low}
            high={high}
            unit={unit}
            period={period}
            isLoading={isLoading}
            className="h-auto"
          />
          <SensorCard className="flex-1" />
        </div>
      </div>
    </PanelPage>
  );
}

/** The selected range as a short label ("6 h", "3 T"). */
function periodLabel(window: TimeWindow, t: (key: string, options?: Record<string, unknown>) => string) {
  return window.rangeMs > DAY
    ? t("common.range_days", { n: Math.round(window.rangeMs / DAY) })
    : t("common.range_hours", { n: Math.round(window.rangeMs / 3_600_000) });
}
