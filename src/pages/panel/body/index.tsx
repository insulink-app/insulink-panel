import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList, type ListColumn } from "@/components/data-list";
import sportService, {
  type Measurement,
  type MeasurementType,
} from "@/api/services/sport-service";

const COLOR = "var(--primary)";

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
    if (ascending.length === 0) return null;
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
    <PanelPage title={t("body.title")}>
      <div className="py-6 flex flex-col gap-6">
        <div className="flex flex-wrap gap-1">
          {METRICS.map((entry) => (
            <Button
              key={entry.type}
              size="sm"
              variant={metricType === entry.type ? "secondary" : "ghost"}
              onClick={() => setMetricType(entry.type)}
            >
              {t(entry.labelKey)}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Stat title={t("body.current")} value={valueOf(stats?.latest, metric.digits, unit)} />
          <Stat title={t("body.average")} value={valueOf(stats?.average, metric.digits, unit)} />
          {metric.daily ? (
            <Stat title={t("body.total")} value={valueOf(stats?.total, metric.digits, unit)} />
          ) : (
            <Stat title={t("body.maximum")} value={valueOf(stats?.max, metric.digits, unit)} />
          )}
          <Stat title={t("body.entries")} value={String(ascending.length)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t(metric.labelKey)}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : chartData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {t("common.no_data")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                {metric.daily ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(value) => format(new Date(value), "dd.MM.")} fontSize={12} />
                    <YAxis fontSize={12} width={44} />
                    <Tooltip content={<MetricTooltip unit={unit} digits={metric.digits} />} isAnimationActive={false} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                    <Bar dataKey="value" fill={COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(value) => format(new Date(value), "dd.MM.")} fontSize={12} />
                    <YAxis fontSize={12} width={44} domain={["dataMin - 1", "dataMax + 1"]} />
                    <Tooltip content={<MetricTooltip unit={unit} digits={metric.digits} />} isAnimationActive={false} />
                    <Line type="monotone" dataKey="value" stroke={COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">
        {point ? format(new Date(point.t), "dd.MM.yyyy") : ""}
      </div>
      <div className="text-sm font-semibold text-popover-foreground">
        {round(Number(payload[0].value), digits)} {unit}
      </div>
    </div>
  );
}

function round(value: number, digits: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function valueOf(value: number | undefined, digits: number, unit: string) {
  return value == null ? "–" : `${round(value, digits)} ${unit}`;
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
