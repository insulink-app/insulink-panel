import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { Card } from "@/components/ui/card";
import { DataList, type ListColumn } from "@/components/data-list";
import { PageHeader } from "@/components/page-header";
import { CardHeading } from "@/components/card-heading";
import { StatStrip } from "@/components/stat-strip";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { TimeRangePicker, TimeWindowNav } from "@/components/time-window";
import { CHART_MARGIN_TIGHT, GRID_STYLE, LINE_STYLE, X_AXIS_STYLE, evenTicks } from "@/components/chart-kit";
import { DAY, useTimeWindow, useWindowedData } from "@/lib/use-time-window";
import healthService, { type PulseSample } from "@/api/services/health-service";

export default function PulsePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["pulse"],
    queryFn: healthService.pulse,
  });

  // Samples arrive unordered; keep an ascending copy for the chart and a
  // descending one for the list.
  const ascending = useMemo(
    () =>
      (data?.samples ?? []).slice().sort((left, right) => left.t - right.t),
    [data],
  );
  const descending = useMemo(
    () => ascending.slice().reverse(),
    [ascending],
  );

  const stats = useMemo(() => {
    if (ascending.length === 0) {
      return null;
    }
    const beats = ascending.map((sample) => sample.b);
    const avg = beats.reduce((sum, value) => sum + value, 0) / beats.length;
    // Resting proxy: mean of the lowest tenth of readings (a full-night RHR
    // needs the app's sleep windows we don't have here).
    const restingCount = Math.max(1, Math.round(beats.length * 0.1));
    const resting =
      beats.slice().sort((left, right) => left - right).slice(0, restingCount)
        .reduce((sum, value) => sum + value, 0) / restingCount;
    return {
      avg: Math.round(avg),
      min: Math.min(...beats),
      max: Math.max(...beats),
      resting: Math.round(resting),
    };
  }, [ascending]);

  const columns: ListColumn<PulseSample>[] = [
    { header: t("pulse.col_time"), cell: (sample) => format(new Date(sample.t), "dd.MM.yyyy HH:mm") },
    { header: t("pulse.col_bpm"), cell: (sample) => `${sample.b} ${t("pulse.bpm")}` },
  ];

  return (
    <PanelPage title={t("pulse.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader title={t("pulse.title")} />
      <div className="flex flex-col gap-4">
        <div className="mb-2 flex items-end gap-2">
          <b className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">{descending[0]?.b ?? "–"}</b>
          <span className="pb-1.5 text-sm text-muted-foreground">{t("pulse.bpm")}</span>
        </div>
        <PulseChart samples={ascending} isLoading={isLoading} />
        <StatStrip
          loading={isLoading}
          cells={[
            { label: t("pulse.minimum"), value: stats?.min ?? "–", unit: t("pulse.bpm") },
            { label: t("pulse.average"), value: stats?.avg ?? "–", unit: t("pulse.bpm") },
            { label: t("pulse.maximum"), value: stats?.max ?? "–", unit: t("pulse.bpm") },
            { label: t("pulse.resting"), value: stats?.resting ?? "–", unit: t("pulse.bpm") },
          ]}
        />

        <DataList
          title={t("pulse.readings")}
          columns={columns}
          data={descending}
          isLoading={isLoading}
          pageSize={25}
        />
      </div>
    </PanelPage>
  );
}

// Pannable, range-adjustable heart-rate graph, one violet line. `samples`
// arrive oldest-first.
function PulseChart({
  samples,
  isLoading,
}: {
  samples: PulseSample[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const latest = samples[samples.length - 1]?.t ?? Date.now();
  const earliest = samples[0]?.t ?? latest;
  const window = useTimeWindow(latest, earliest);
  const windowData = useWindowedData(samples, (sample) => sample.t, window);
  const beats = windowData.map((sample) => sample.b);
  const yMin = beats.length ? Math.min(...beats) - 5 : 0;
  const yMax = beats.length ? Math.max(...beats) + 5 : 100;

  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("pulse.chart_title")} action={<TimeRangePicker window={window} />} />
      <div className="mt-3">
        <TimeWindowNav window={window} />
      </div>
      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : windowData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={windowData} margin={CHART_MARGIN_TIGHT}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                {...X_AXIS_STYLE}
                dataKey="t"
                type="number"
                domain={[window.start, window.end]}
                ticks={evenTicks(window.start, window.end)}
                tickFormatter={(value) => format(new Date(value), window.rangeMs > DAY ? "dd.MM." : "HH:mm")}
              />
              <YAxis hide domain={[yMin, yMax]} />
              <Tooltip
                content={<PulseTooltip unit={t("pulse.bpm")} />}
                cursor={{ stroke: "var(--divider)" }}
                isAnimationActive={false}
              />
              <Line {...LINE_STYLE} dataKey="b" stroke="var(--pulse)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function PulseTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: PulseSample }[];
  unit?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <ChartTooltipBox caption={point ? format(new Date(point.t), "dd.MM. HH:mm") : ""}>
      <ChartTooltipValue>
        {payload[0].value} {unit}
      </ChartTooltipValue>
    </ChartTooltipBox>
  );
}
