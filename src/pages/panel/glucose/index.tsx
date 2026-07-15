import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList, type ListColumn } from "@/components/data-list";
import { StatCard } from "@/components/stat-card";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { TimeRangePicker, TimeWindowNav } from "@/components/time-window";
import { DAY, useTimeWindow, useWindowedData } from "@/lib/use-time-window";
import glucoseService, {
  type GlucoseEntry,
} from "@/api/services/glucose-service";
import settingsService from "@/api/services/settings-service";
import {
  classify,
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  statusColorVar,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";
import { useGlucoseHex } from "@/lib/use-glucose-hex";
import { ThresholdGradient } from "@/components/threshold-gradient";
import { CHART_HEIGHT, CHART_MARGIN, X_AXIS_HEIGHT } from "@/lib/chart-geometry";

export default function GlucosePage() {
  const { t } = useTranslation();
  const statusLabel: Record<string, string> = {
    low: t("glucose.status_low"),
    "in-range": t("glucose.status_in_range"),
    high: t("glucose.status_high"),
  };
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

  const entries = useMemo(
    () => (data?.entries ?? []).slice().sort((left, right) => right.time - left.time),
    [data],
  );

  const stats = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }
    const values = entries.map((entry) => entry.value);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const inRange = entries.filter(
      (entry) => classify(entry.value, low, high) === "in-range",
    ).length;
    return {
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      tir: Math.round((inRange / entries.length) * 100),
    };
  }, [entries, low, high]);

  const columns = useMemo<ListColumn<GlucoseEntry>[]>(
    () => [
      {
        header: t("glucose.col_time"),
        cell: (entry) => format(new Date(entry.time), "dd.MM.yyyy HH:mm"),
      },
      {
        header: t("glucose.col_value"),
        cell: (entry) => `${toDisplay(entry.value, unit)} ${unitLabel(unit)}`,
      },
      {
        header: t("glucose.col_status"),
        cell: (entry) => {
          const status = classify(entry.value, low, high);
          return (
            <span style={{ color: statusColorVar[status] }}>
              {statusLabel[status]}
            </span>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unit, low, high, t],
  );

  return (
    <PanelPage title={t("glucose.title")}>
      <div className="py-6 flex flex-col gap-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard title={t("glucose.average")} value={formatReading(stats?.avg, unit)} />
          <StatCard title={t("glucose.minimum")} value={formatReading(stats?.min, unit)} />
          <StatCard title={t("glucose.maximum")} value={formatReading(stats?.max, unit)} />
          <StatCard title={t("glucose.in_range")} value={stats ? `${stats.tir} %` : "–"} />
        </div>
        <GlucoseChart entries={entries} low={low} high={high} unit={unit} />
        <DataList
          title={t("glucose.readings")}
          columns={columns}
          data={entries}
          isLoading={isLoading}
          pageSize={25}
        />
      </div>
    </PanelPage>
  );
}

// Pannable, range-adjustable glucose graph. `entries` arrive newest-first.
function GlucoseChart({
  entries,
  low,
  high,
  unit,
}: {
  entries: GlucoseEntry[];
  low: number;
  high: number;
  unit?: string;
}) {
  const { t } = useTranslation();
  const hex = useGlucoseHex();

  const ascending = useMemo(() => entries.slice().reverse(), [entries]);
  const latest = ascending[ascending.length - 1]?.time ?? Date.now();
  const earliest = ascending[0]?.time ?? latest;
  const window = useTimeWindow(latest, earliest);
  const windowData = useWindowedData(ascending, (entry) => entry.time, window);

  const values = windowData.map((entry) => entry.value);
  const yMin = Math.min(low - 20, ...(values.length ? values : [low]));
  const yMax = Math.max(high + 20, ...(values.length ? values : [high]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle>{t("glucose.chart_title")}</CardTitle>
        <TimeRangePicker window={window} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <TimeWindowNav window={window} />
        {windowData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={windowData} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={[window.start, window.end]}
                tickFormatter={(value) =>
                  format(new Date(value), window.rangeMs > DAY ? "dd.MM." : "HH:mm")
                }
                fontSize={12}
                height={X_AXIS_HEIGHT}
              />
              <YAxis domain={[yMin, yMax]} fontSize={12} width={36} />
              <Tooltip
                content={<GlucoseTooltip unit={unit} />}
                cursor={{ stroke: "var(--border)" }}
                isAnimationActive={false}
              />
              {/* Threshold zones: below low reads red, in-target green, above
                  high orange. Outer bounds run past the axis; Recharts clips. */}
              <ReferenceArea y1={0} y2={low} fill={hex.low} fillOpacity={0.07} />
              <ReferenceArea y1={low} y2={high} fill={hex["in-range"]} fillOpacity={0.08} />
              <ReferenceArea y1={high} y2={1000} fill={hex.high} fillOpacity={0.07} />
              <ReferenceLine y={low} stroke={hex.low} strokeOpacity={0.5} strokeDasharray="4 4" />
              <ReferenceLine y={high} stroke={hex.high} strokeOpacity={0.5} strokeDasharray="4 4" />
              <defs>
                <ThresholdGradient
                  id="glucose-line"
                  yMin={yMin}
                  yMax={yMax}
                  bands={[
                    { color: hex.high, until: high },
                    { color: hex["in-range"], until: low },
                    { color: hex.low },
                  ]}
                />
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#glucose-line)"
                strokeWidth={2}
                fill="url(#glucose-line)"
                fillOpacity={0.12}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function GlucoseTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: number;
  unit?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <ChartTooltipBox caption={format(new Date(label as number), "dd.MM. HH:mm")}>
      <ChartTooltipValue>
        {toDisplay(Number(payload[0].value), unit)} {unitLabel(unit)}
      </ChartTooltipValue>
    </ChartTooltipBox>
  );
}

function formatReading(value: number | undefined, unit?: string) {
  return value == null ? "–" : `${toDisplay(value, unit)} ${unitLabel(unit)}`;
}
