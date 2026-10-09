import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, subMonths } from "date-fns";
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dumbbell, Pencil, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { ConfirmDelete } from "@/components/confirm-delete";
import { KpiStrip } from "@/components/kpi-strip";
import { ListRow } from "@/components/list-row";
import { Segmented } from "@/components/segmented";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { CHART_MARGIN_TIGHT, GRID_STYLE, LINE_STYLE, NOW_DOT, X_AXIS_STYLE, thresholdLabel } from "@/components/chart-kit";
import type { Routine, SportExercise } from "@/api/services/sport-service";
import { formatDay } from "@/lib/when";
import { formatScore, type ExerciseStat } from "../exercise-stats/stats";

type Span = 3 | 6 | 0;

/**
 * The selected exercise: edit and delete, its key figures, the best set per
 * session over time against the best ever, and the routines it is part of.
 */
export function ExerciseDetail({
  exercise,
  stat,
  routines,
  deleting,
  onEdit,
  onDelete,
}: {
  exercise: SportExercise;
  stat?: ExerciseStat;
  routines: Routine[];
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [span, setSpan] = useState<Span>(0);
  const sessions = stat?.sessions ?? [];
  const since = span === 0 ? 0 : subMonths(new Date(), span).getTime();
  const shown = sessions.filter((session) => session.time >= since).map((session) => ({ t: session.time, value: session.best }));
  const average = sessions.length ? sessions.reduce((sum, session) => sum + session.best, 0) / sessions.length : 0;
  const score = (value: number) => formatScore(value, exercise.kind, t);
  const memberships = routines.flatMap((routine) =>
    routine.items.flatMap((item, index) => (item.ex === exercise.id ? [{ routine, item, index }] : [])),
  );

  return (
    <Card className="gap-0 p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[min(100%,14rem)] flex-1">
          <h2 className="text-[26px] leading-tight font-extrabold break-words">{exercise.name}</h2>
          <span className="text-sm text-muted-foreground">
            {t("exercises.kind_" + exercise.kind)}
            {sessions[0] && ` · ${t("exercises.since", { date: format(new Date(sessions[0].time), "dd.MM.yyyy") })}`}
          </span>
        </div>
        <Button variant="outline" className="h-10 border border-line bg-panel px-4 hover:bg-raised" onClick={onEdit}>
          <Pencil className="size-4" />
          {t("common.edit")}
        </Button>
        <ConfirmDelete onConfirm={onDelete} description={t("exercises.delete_confirm", { name: exercise.name })}>
          <Button size="icon" variant="secondary" aria-label={t("common.delete")} disabled={deleting}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </ConfirmDelete>
      </div>

      <div className="my-6">
        <KpiStrip
          cells={[
            { label: t("exercise_stats.total_sets"), value: stat?.totalSets ?? 0 },
            { label: t("exercise_stats.best"), value: stat ? score(stat.best) : "–" },
            { label: t("exercises.per_session"), value: stat ? score(average) : "–" },
            { label: t("exercises.last"), value: stat ? formatDay(stat.lastAt, t, i18n.language) : "–" },
          ]}
        />
      </div>

      <div className="border-t border-divider pt-6">
        <CardHeading
          title={t("exercise_stats.progression")}
          action={
            <Segmented
              label={t("overview.range")}
              value={span}
              onChange={setSpan}
              options={[
                { value: 3, label: t("exercises.range_months", { n: 3 }) },
                { value: 6, label: t("exercises.range_months", { n: 6 }) },
                { value: 0, label: t("exercises.range_all") },
              ]}
            />
          }
        />
        <div className="mt-5">
          {shown.length < 2 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t("exercise_stats.not_enough_data")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={shown} margin={CHART_MARGIN_TIGHT}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  {...X_AXIS_STYLE}
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                  minTickGap={40}
                />
                <YAxis hide domain={["dataMin - 1", "dataMax + 2"]} />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: "var(--divider)" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltipBox caption={format(new Date(label as number), "dd.MM.yyyy")}>
                        <ChartTooltipValue>{score(Number(payload[0].value))}</ChartTooltipValue>
                      </ChartTooltipBox>
                    ) : null
                  }
                />
                {stat && (
                  <ReferenceLine
                    y={stat.best}
                    stroke="var(--brand)"
                    strokeOpacity={0.6}
                    strokeDasharray="4 4"
                    label={thresholdLabel(t("exercises.best_line", { value: score(stat.best) }))}
                  />
                )}
                <Line {...LINE_STYLE} dataKey="value" stroke="var(--brand)" />
                <ReferenceDot x={shown[shown.length - 1].t} y={shown[shown.length - 1].value} {...NOW_DOT} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-divider pt-6">
        <CardHeading title={t("exercises.in_routines")} />
        <div className="mt-2 divide-y divide-divider">
          {memberships.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("exercises.not_in_routines")}</p>
          ) : (
            memberships.map(({ routine, item, index }) => (
              <ListRow
                key={`${routine.id}-${item.id}`}
                to={`/health/routines/${routine.id}`}
                icon={<Dumbbell />}
                title={routine.name || t("routines.untitled")}
                subtitle={[
                  t("routines.rail.sets", { count: item.sets }),
                  exercise.kind === "timed" ? t("routines.rail.seconds", { n: item.target }) : t("exercise_stats.reps", { n: item.target }),
                ].join(" · ")}
                value={t("exercises.position", { n: index + 1, total: routine.items.length })}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
