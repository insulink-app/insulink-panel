import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
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
import { Segmented } from "@/components/segmented";
import { StatStrip } from "@/components/stat-strip";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import {
  BAR_FILL,
  BAR_FILL_CURRENT,
  BAR_STYLE,
  CHART_MARGIN_TIGHT,
  GRID_STYLE,
  LINE_STYLE,
  X_AXIS_STYLE,
  thresholdLabel,
} from "@/components/chart-kit";
import { formatNumber } from "@/lib/format";
import sportService, {
  type Measurement,
  type MeasurementType,
} from "@/api/services/sport-service";

// Per-metric formatting. `daily` metrics get a bar chart (one bar per day),
// weight gets a line (a continuous body measurement).
const METRICS: {
  type: MeasurementType;
  labelKey: string;
  unitKey: string;
  daily: boolean;
  digits: number;
}[] = [
  { type: "WEIGHT", labelKey: "body.weight", unitKey: "body.kg", daily: false, digits: 1 },
  { type: "STEPS", labelKey: "body.steps", unitKey: "body.unit_steps", daily: true, digits: 0 },
  { type: "DISTANCE", labelKey: "body.distance", unitKey: "body.km", daily: true, digits: 2 },
  { type: "CALORIES", labelKey: "body.calories", unitKey: "body.kcal", daily: true, digits: 0 },
];

export default function BodyPage() {
  const { t } = useTranslation();
  const [metricType, setMetricType] = useState<MeasurementType>("WEIGHT");
  const { data, isLoading } = useQuery({
    queryKey: ["measurements"],
    queryFn: sportService.measurements,
  });

  const metric = METRICS.find((entry) => entry.type === metricType) ?? METRICS[0];
  const unit = t(metric.unitKey);

  // Ascending for the chart, descending for the list.
  const ascending = useMemo(
    () =>
      (data?.entries ?? [])
        .filter((entry) => entry.type === metricType)
        .sort((left, right) => left.time - right.time),
    [data, metricType],
  );

  const stats = useMemo(() => {
    if (ascending.length === 0) {
      return null;
    }
    const values = ascending.map((entry) => entry.value);
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      latest: values[values.length - 1],
      average: total / values.length,
      total,
      max: Math.max(...values),
    };
  }, [ascending]);

  const chartData = ascending.map((entry) => ({ t: entry.time, value: entry.value }));

  const columns: ListColumn<Measurement>[] = [
    { header: t("body.col_date"), cell: (entry) => format(new Date(entry.time), metric.daily ? "dd.MM.yyyy" : "dd.MM.yyyy HH:mm") },
    { header: t("body.col_value"), cell: (entry) => `${round(entry.value, metric.digits)} ${unit}` },
  ];

  return (
    <PanelPage title={t("body.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader
        title={t("body.title")}
        actions={
          <Segmented
            label={t("body.title")}
            value={metricType}
            onChange={setMetricType}
            className="bg-panel"
            options={METRICS.map((entry) => ({ value: entry.type, label: t(entry.labelKey) }))}
          />
        }
      />
      <div className="flex flex-col gap-4">
        <div className="mb-2 flex items-end gap-2">
          <b className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">
            {stats ? round(stats.latest, metric.digits) : "–"}
          </b>
          <span className="pb-1.5 text-sm text-muted-foreground">{unit}</span>
        </div>

        <Card className="gap-0 p-6">
          <CardHeading title={t(metric.labelKey)} />
          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : chartData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                {metric.daily ? (
                  <BarChart data={chartData} margin={CHART_MARGIN_TIGHT}>
                    <XAxis {...X_AXIS_STYLE} dataKey="t" tickFormatter={(value) => format(new Date(value), "dd.MM.")} minTickGap={24} />
                    <YAxis hide />
                    <Tooltip content={<MetricTooltip unit={unit} digits={metric.digits} />} isAnimationActive={false} cursor={{ fill: "var(--raised)" }} />
                    <Bar {...BAR_STYLE} dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={entry.t} fill={index === chartData.length - 1 ? BAR_FILL_CURRENT : BAR_FILL} />
                      ))}
                    </Bar>
                    {stats && (
                      <ReferenceLine
                        y={stats.average}
                        stroke="var(--text-muted)"
                        strokeDasharray="4 4"
                        label={thresholdLabel(round(stats.average, metric.digits))}
                      />
                    )}
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={CHART_MARGIN_TIGHT}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis {...X_AXIS_STYLE} dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(value) => format(new Date(value), "dd.MM.")} minTickGap={40} />
                    <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                    <Tooltip content={<MetricTooltip unit={unit} digits={metric.digits} />} isAnimationActive={false} cursor={{ stroke: "var(--divider)" }} />
                    <Line {...LINE_STYLE} dataKey="value" stroke="var(--brand)" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <StatStrip
          loading={isLoading}
          cells={[
            { label: t("body.current"), value: stats ? round(stats.latest, metric.digits) : "–", unit },
            { label: t("body.average"), value: stats ? round(stats.average, metric.digits) : "–", unit },
            metric.daily
              ? { label: t("body.total"), value: stats ? round(stats.total, metric.digits) : "–", unit }
              : { label: t("body.maximum"), value: stats ? round(stats.max, metric.digits) : "–", unit },
            { label: t("body.entries"), value: formatNumber(ascending.length) },
          ]}
        />

        <DataList
          title={t("body.readings")}
          columns={columns}
          data={ascending.slice().reverse()}
          isLoading={isLoading}
          pageSize={25}
        />
      </div>
    </PanelPage>
  );
}

function MetricTooltip({
  active,
  payload,
  unit,
  digits,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: { t: number } }[];
  unit?: string;
  digits: number;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <ChartTooltipBox caption={point ? format(new Date(point.t), "dd.MM.yyyy") : ""}>
      <ChartTooltipValue>
        {round(Number(payload[0].value), digits)} {unit}
      </ChartTooltipValue>
    </ChartTooltipBox>
  );
}

function round(value: number, digits: number) {
  return formatNumber(value, digits);
}
