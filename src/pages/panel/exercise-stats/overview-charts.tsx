// The whole-training overview: how consistently you train, and how each routine
// run compares to the last.
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Routine, Workout } from "@/api/services/sport-service";
import { routineComparison, weeklyBuckets } from "./stats";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { ChartCard, StatTooltip } from "./shared";
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

export function OverviewCharts({ workouts, routines }: { workouts: Workout[]; routines: Routine[] }) {
  const { t } = useTranslation();
  const frequency = useMemo(() => weeklyBuckets(workouts, () => 1), [workouts]);
  const comparison = useMemo(
    () => routineComparison(workouts, routines, t("routines.untitled")),
    [workouts, routines, t],
  );

  if (workouts.length === 0) {
    return null;
  }
  const average = frequency.reduce((sum, week) => sum + week.value, 0) / Math.max(1, frequency.length);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title={t("exercise_stats.chart_frequency")}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={frequency} margin={CHART_MARGIN_TIGHT}>
            <XAxis
              {...X_AXIS_STYLE}
              dataKey="time"
              tickFormatter={(value) => format(new Date(value), "dd.MM.")}
              interval="preserveStartEnd"
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: "var(--raised)" }}
              content={
                <StatTooltip
                  formatLabel={(label) => format(new Date(label as number), "dd.MM.yyyy")}
                  formatValue={(value) => `${value} ${t("exercise_stats.workouts")}`}
                />
              }
            />
            <Bar {...BAR_STYLE} dataKey="value">
              {frequency.map((week, index) => (
                <Cell key={week.time} fill={index === frequency.length - 1 ? BAR_FILL_CURRENT : BAR_FILL} />
              ))}
            </Bar>
            <ReferenceLine
              y={average}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              label={thresholdLabel(formatNumber(average, 1))}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("exercise_stats.chart_comparison")}>
        {comparison.length === 0 ? (
          <p className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
            {t("exercise_stats.comparison_empty")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart margin={CHART_MARGIN_TIGHT}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis
                {...X_AXIS_STYLE}
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                allowDuplicatedCategory={false}
                minTickGap={32}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: "var(--divider)" }}
                content={<ComparisonTooltip achievedLabel={t("exercise_stats.achieved")} />}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
              {comparison.map((series) => (
                <Line
                  key={series.name}
                  data={series.points}
                  dataKey="value"
                  name={series.name}
                  {...LINE_STYLE}
                  stroke={series.color}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

// Lists each routine that has a run at this point, its score, and the change
// from that routine's previous run (the "more/less than last time" the chart is
// built to show).
function ComparisonTooltip({
  active,
  payload,
  label,
  achievedLabel,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string; color?: string; payload?: { delta: number } }[];
  label?: number | string;
  achievedLabel: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <ChartTooltipBox caption={format(new Date(label as number), "dd.MM.yyyy")}>
      {payload.map((entry) => {
        const delta = entry.payload?.delta ?? 0;
        const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
        return (
          <ChartTooltipValue key={entry.name} className="mt-1">
            <span style={{ color: entry.color }}>{entry.name}</span>
            {": "}
            {formatNumber(Math.round(Number(entry.value)))} {achievedLabel}
            <span
              className="ml-1 text-xs font-medium"
              style={{
                color: delta > 0 ? "var(--brand-text)" : "var(--text-muted)",
              }}
            >
              ({sign}
              {formatNumber(Math.abs(Math.round(delta)))})
            </span>
          </ChartTooltipValue>
        );
      })}
    </ChartTooltipBox>
  );
}
