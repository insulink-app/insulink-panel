import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import PanelPage from "@/layouts/panel";
import { Download, Heart } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { KpiStrip } from "@/components/kpi-strip";
import { TimeWindowBar } from "@/components/time-window";
import { RangeHistory, type HistoryScale } from "@/components/range-history";
import { formatNumber } from "@/lib/format";
import { DAY, useTimeWindow, useWindowedData } from "@/lib/use-time-window";
import healthService from "@/api/services/health-service";
import { PulseChart } from "./pulse-chart";
import { RestingWeekCard, ZonesCard } from "./side-cards";
import { PULSE_ELEVATED, PULSE_REST } from "./zones";

// Where the history strip starts and ends, in bpm.
const STRIP_DOMAIN: [number, number] = [40, 160];

export default function PulsePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ["pulse"], queryFn: healthService.pulse });
  const days = useQuery({ queryKey: ["health-days"], queryFn: healthService.days });

  const ascending = useMemo(
    () => (data?.samples ?? []).slice().sort((left, right) => left.t - right.t),
    [data],
  );
  const descending = useMemo(() => ascending.slice().reverse(), [ascending]);
  const latest = ascending[ascending.length - 1];
  const window = useTimeWindow(latest?.t ?? Date.now(), ascending[0]?.t ?? Date.now());
  const windowData = useWindowedData(ascending, (sample) => sample.t, window);
  const stats = useMemo(() => pulseStats(windowData.map((sample) => sample.b)), [windowData]);
  const period =
    window.rangeMs > DAY
      ? t("common.range_days", { n: Math.round(window.rangeMs / DAY) })
      : t("common.range_hours", { n: Math.round(window.rangeMs / 3_600_000) });

  const scale: HistoryScale = {
    unit: t("pulse.bpm"),
    band: [PULSE_REST, PULSE_ELEVATED],
    domain: STRIP_DOMAIN,
    format: (value) => String(value),
    color: () => "var(--pulse)",
    change: (value, previous) => value - previous,
  };
  const bpm = t("pulse.bpm");

  return (
    <PanelPage title={t("pulse.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader title={t("pulse.title")} />
      <div className="mb-6 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="flex items-center gap-3.5">
          <b className="text-[80px] leading-[0.9] font-extrabold tracking-[-0.045em]">{latest?.b ?? "–"}</b>
          <span className="grid size-11 place-items-center rounded-full bg-pulse/14 text-pulse">
            <Heart size={20} aria-hidden />
          </span>
          <span className="text-sm leading-[1.45] text-muted-foreground">
            <b className="text-foreground">{bpm}</b>
            {latest && (
              <>
                <br />
                {format(new Date(latest.t), "HH:mm")}
              </>
            )}
          </span>
        </div>
        <KpiStrip
          cells={[
            { label: t("pulse.minimum"), value: stats?.min ?? "–", unit: bpm },
            { label: t("pulse.average"), value: stats?.avg ?? "–", unit: bpm },
            { label: t("pulse.maximum"), value: stats?.max ?? "–", unit: bpm },
            { label: t("pulse.resting"), value: stats?.resting ?? "–", unit: bpm },
          ]}
        />
      </div>

      <Card className="mb-4 gap-0 p-6">
        <TimeWindowBar window={window} />
        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : windowData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
          ) : (
            <PulseChart window={window} samples={windowData} />
          )}
        </div>
      </Card>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Card className="gap-0 p-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="flex-1 text-lg font-extrabold">
              {t("pulse.readings")}
              <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(ascending.length)}</span>
            </h2>
            <Button asChild variant="outline" size="sm" className="h-9 border border-line bg-panel px-4 text-sm">
              <Link to="/export/">
                <Download className="size-4" />
                {t("common.export")}
              </Link>
            </Button>
          </div>
          <RangeHistory readings={descending.map((sample) => ({ time: sample.t, value: sample.b }))} scale={scale} olderLabel={t("pulse.older")} />
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <ZonesCard samples={windowData} period={period} />
          <RestingWeekCard days={days.data?.days ?? []} className="flex-1" />
        </div>
      </div>
    </PanelPage>
  );
}

/**
 * Minimum, mean, maximum and a resting proxy: the mean of the lowest tenth of
 * the readings (a full-night resting rate needs the app's sleep windows).
 */
function pulseStats(beats: number[]) {
  if (beats.length === 0) {
    return null;
  }
  const sorted = beats.slice().sort((left, right) => left - right);
  const restingCount = Math.max(1, Math.round(beats.length * 0.1));
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum(beats) / beats.length),
    resting: Math.round(sum(sorted.slice(0, restingCount)) / restingCount),
  };
}
