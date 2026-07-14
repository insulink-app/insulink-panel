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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList, type ListColumn } from "@/components/data-list";
import { TimeRangePicker, TimeWindowNav } from "@/components/time-window";
import { DAY, useTimeWindow, useWindowedData } from "@/lib/use-time-window";
import healthService, { type PulseSample } from "@/api/services/health-service";

const PULSE_COLOR = "#e0533d";

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
    if (ascending.length === 0) return null;
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
      <div className="py-6 flex flex-col gap-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Stat title={t("pulse.average")} value={bpm(stats?.avg, t)} />
          <Stat title={t("pulse.resting")} value={bpm(stats?.resting, t)} />
          <Stat title={t("pulse.minimum")} value={bpm(stats?.min, t)} />
          <Stat title={t("pulse.maximum")} value={bpm(stats?.max, t)} />
        </div>

        <PulseChart samples={ascending} isLoading={isLoading} />

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

// Pannable, range-adjustable heart-rate graph. `samples` arrive oldest-first.
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle>{t("pulse.chart_title")}</CardTitle>
        <TimeRangePicker window={window} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <TimeWindowNav window={window} />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : windowData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={windowData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[window.start, window.end]}
                tickFormatter={(value) =>
                  format(new Date(value), window.rangeMs > DAY ? "dd.MM." : "HH:mm")
                }
                fontSize={12}
              />
              <YAxis fontSize={12} width={36} domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip content={<PulseTooltip unit={t("pulse.bpm")} />} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="b"
                stroke={PULSE_COLOR}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
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
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">
        {point ? format(new Date(point.t), "dd.MM. HH:mm") : ""}
      </div>
      <div className="text-sm font-semibold text-popover-foreground">
        {payload[0].value} {unit}
      </div>
    </div>
  );
}

function bpm(value: number | undefined, t: (key: string) => string) {
  return value == null ? "–" : `${value} ${t("pulse.bpm")}`;
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
