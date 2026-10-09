import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import {
  BAR_FILL,
  BAR_FILL_CURRENT,
  BAR_STYLE,
  CHART_MARGIN_TIGHT,
  GRID_STYLE,
  LINE_STYLE,
  NOW_DOT,
  X_AXIS_STYLE,
  thresholdLabel,
} from "@/components/chart-kit";
import { formatNumber } from "@/lib/format";
import { withWeeklyAverage, type MetricSpec } from "./series";

/**
 * Weight as a thin muted line of the readings under the seven-day average in
 * the brand colour; daily totals as bars with their average dashed.
 */
export function BodyChart({
  points,
  metric,
  unit,
  goal,
}: {
  points: { t: number; value: number }[];
  metric: MetricSpec;
  unit: string;
  goal?: number;
}) {
  const { t } = useTranslation();
  const tooltip = (
    <Tooltip
      isAnimationActive={false}
      cursor={
        metric.daily ? { fill: "var(--raised)" } : { stroke: "var(--divider)" }
      }
      content={({ active, payload, label }) =>
        active && payload?.length ? (
          <ChartTooltipBox
            caption={format(new Date(label as number), "dd.MM.yyyy")}
          >
            <ChartTooltipValue>
              {formatNumber(Number(payload[0].payload.value), metric.digits)}{" "}
              {unit}
            </ChartTooltipValue>
          </ChartTooltipBox>
        ) : null
      }
    />
  );
  if (metric.daily) {
    const average =
      points.reduce((sum, point) => sum + point.value, 0) /
      Math.max(1, points.length);
    return (
      <div className="min-h-[300px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={CHART_MARGIN_TIGHT}
            barCategoryGap="22%"
          >
            <XAxis
              {...X_AXIS_STYLE}
              dataKey="t"
              tickFormatter={(value) => format(new Date(value), "dd.MM.")}
              minTickGap={40}
            />
            <YAxis hide />
            {tooltip}
            <Bar {...BAR_STYLE} dataKey="value">
              {points.map((point, index) => (
                <Cell
                  key={point.t}
                  fill={
                    index === points.length - 1 ? BAR_FILL_CURRENT : BAR_FILL
                  }
                />
              ))}
            </Bar>
            <ReferenceLine
              y={average}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              label={thresholdLabel(
                `Ø ${formatNumber(average, metric.digits)}`,
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  const averaged = withWeeklyAverage(points);
  const latest = averaged[averaged.length - 1];
  return (
    <>
      <div className="min-h-[300px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={averaged} margin={CHART_MARGIN_TIGHT}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              {...X_AXIS_STYLE}
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => format(new Date(value), "dd.MM.")}
              minTickGap={50}
            />
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
            {tooltip}
            {goal != null && (
              <ReferenceLine
                y={goal}
                stroke="var(--text-muted)"
                strokeOpacity={0.5}
                strokeDasharray="2 5"
                label={thresholdLabel(
                  t("body.goal", {
                    value: `${formatNumber(goal, metric.digits)} ${unit}`,
                  }),
                )}
              />
            )}
            <Line
              {...LINE_STYLE}
              dataKey="value"
              stroke="var(--text-muted)"
              strokeOpacity={0.55}
              strokeWidth={1.2}
            />
            <Line {...LINE_STYLE} dataKey="average" stroke="var(--brand)" />
            {latest && (
              <ReferenceDot x={latest.t} y={latest.average} {...NOW_DOT} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="block h-[3px] w-4 rounded bg-primary" aria-hidden />
          {t("body.average_7")}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="block h-px w-4 bg-muted-foreground" aria-hidden />
          {t("body.raw")}
        </span>
      </div>
    </>
  );
}
