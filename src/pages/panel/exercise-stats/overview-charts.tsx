import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Routine, Workout } from "@/api/services/sport-service";
import { WeeklyBars } from "@/components/weekly-bars";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { CHART_MARGIN_TIGHT, GRID_STYLE, LINE_STYLE, X_AXIS_STYLE } from "@/components/chart-kit";
import { routineDurations, weeklyBuckets, type RoutineSeries } from "./stats";
import { ChartCard } from "./shared";

import { DURATION_CHART_HEIGHT as HEIGHT, endLabelPositions, topOf } from "./label-positions";

/** Workouts per week beside how long each routine's runs took. */
export function OverviewCharts({
  workouts,
  routines,
  weekCount,
}: {
  workouts: Workout[];
  routines: Routine[];
  weekCount: number;
}) {
  const { t } = useTranslation();
  const frequency = useMemo(() => weeklyBuckets(workouts, () => 1, weekCount), [workouts, weekCount]);
  const durations = useMemo(
    () => routineDurations(workouts, routines, t("routines.untitled")),
    [workouts, routines, t],
  );

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-2">
      <ChartCard title={t("routines.per_week")}>
        <WeeklyBars
          data={frequency}
          height={HEIGHT}
          averageLabel={(avg) => t("routines.average_short", { avg })}
          formatValue={(value) => `${value} ${t("exercise_stats.workouts")}`}
        />
      </ChartCard>
      <ChartCard title={t("exercise_stats.chart_duration")}>
        {durations.length === 0 ? (
          <p className="flex items-center justify-center text-center text-sm text-muted-foreground" style={{ height: HEIGHT }}>
            {t("exercise_stats.comparison_empty")}
          </p>
        ) : (
          <DurationChart series={durations} />
        )}
      </ChartCard>
    </div>
  );
}

/** One line per routine, named at its end instead of in a legend. */
function DurationChart({ series }: { series: RoutineSeries[] }) {
  const { t } = useTranslation();
  const minutes = t("overview.unit_min");
  const labelY = endLabelPositions(series);
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <LineChart margin={{ ...CHART_MARGIN_TIGHT, right: 120 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          {...X_AXIS_STYLE}
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(value) => format(new Date(value), "dd.MM.")}
          allowDuplicatedCategory={false}
          minTickGap={40}
        />
        <YAxis hide domain={[0, topOf(series)]} />
        <Tooltip
          isAnimationActive={false}
          cursor={{ stroke: "var(--divider)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <ChartTooltipBox caption={format(new Date(label as number), "dd.MM.yyyy")}>
                {payload.map((entry) => (
                  <ChartTooltipValue key={String(entry.name)} color={entry.color}>
                    {entry.name}: {entry.value} {minutes}
                  </ChartTooltipValue>
                ))}
              </ChartTooltipBox>
            ) : null
          }
        />
        {series.map((line) => (
          <Line
            {...LINE_STYLE}
            key={line.name}
            data={line.points}
            dataKey="value"
            name={line.name}
            stroke={line.color}
            label={(props: { x?: number | string; y?: number | string; index?: number }) =>
              props.index === line.points.length - 1 ? (
                <EndLabel
                  key={line.name}
                  x={Number(props.x)}
                  y={labelY.get(line.name) ?? Number(props.y)}
                  color={line.color}
                  name={line.name}
                  value={`${line.points[line.points.length - 1].value} ${minutes}`}
                />
              ) : (
                <g key={`${line.name}-${props.index}`} />
              )
            }
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** A line's name and latest value, written right after its last point. */
function EndLabel({ x, y, color, name, value }: { x: number; y: number; color: string; name: string; value: string }) {
  return (
    <g>
      <circle cx={x + 14} cy={y} r={4} fill={color} />
      <text x={x + 24} y={y + 4} fontSize={12} fontWeight={700} fill="var(--text)">
        {name.length > 12 ? `${name.slice(0, 11)}…` : name}
        <tspan fontWeight={400} fill="var(--text-muted)">{` ${value}`}</tspan>
      </text>
    </g>
  );
}

