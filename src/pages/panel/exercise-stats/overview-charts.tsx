// The whole-training overview: how consistently you train, and how each routine
// run compares to the last.
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Routine, Workout } from "@/api/services/sport-service";
import { routineComparison, weeklyBuckets } from "./stats";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { ChartCard, StatTooltip } from "./shared";

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title={t("exercise_stats.chart_frequency")}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={frequency}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="time"
              tickFormatter={(value) => format(new Date(value), "dd.MM.")}
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis fontSize={12} width={28} allowDecimals={false} />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              content={
                <StatTooltip
                  formatLabel={(label) => format(new Date(label as number), "dd.MM.yyyy")}
                  formatValue={(value) => `${value} ${t("exercise_stats.workouts")}`}
                />
              }
            />
            <Bar
              dataKey="value"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
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
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                fontSize={12}
                allowDuplicatedCategory={false}
              />
              <YAxis fontSize={12} width={36} allowDecimals={false} />
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: "var(--border)" }}
                content={<ComparisonTooltip achievedLabel={t("exercise_stats.achieved")} />}
              />
              <Legend />
              {comparison.map((series) => (
                <Line
                  key={series.name}
                  data={series.points}
                  dataKey="value"
                  name={series.name}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
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
            {Math.round(Number(entry.value)).toLocaleString()} {achievedLabel}
            <span
              className="ml-1 text-xs font-medium"
              style={{
                color:
                  delta > 0
                    ? "var(--glucose-in-range)"
                    : delta < 0
                      ? "var(--glucose-low)"
                      : undefined,
              }}
            >
              ({sign}
              {Math.abs(Math.round(delta)).toLocaleString()})
            </span>
          </ChartTooltipValue>
        );
      })}
    </ChartTooltipBox>
  );
}
