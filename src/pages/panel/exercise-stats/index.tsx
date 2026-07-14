import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, startOfWeek } from "date-fns";
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
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList, type ListColumn } from "@/components/data-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import sportService, {
  type Routine,
  type SetLog,
  type SportExercise,
  type Workout,
} from "@/api/services/sport-service";

// Epley estimate, the standard one-rep-max formula — lets a heavy triple and a
// light set of twelve compare on one axis for the progression chart.
function estimatedOneRepMax(set: SetLog): number {
  const kg = set.kg ?? 0;
  const reps = set.reps ?? 0;
  if (kg <= 0 || reps <= 0) {
    return 0;
  }
  return kg * (1 + reps / 30);
}

// The single number that says "how good was this set" for the exercise's kind:
// est. 1RM for weighted, reps for bodyweight, seconds held for timed.
function setScore(set: SetLog, kind: SportExercise["kind"]): number {
  if (kind === "weighted") {
    return estimatedOneRepMax(set);
  }
  if (kind === "timed") {
    return set.secs ?? 0;
  }
  return set.reps ?? 0;
}

interface Session {
  time: number;
  best: number; // best setScore in the session
  sets: number;
}

interface ExerciseStat {
  exercise: SportExercise;
  totalSets: number;
  best: number; // best setScore across all sessions
  lastAt: number;
  sessions: Session[]; // chronological
}

// Roll every logged set across every workout into per-exercise stats. One pass:
// group sets by workout+exercise for the per-session best, and accumulate the
// exercise totals alongside.
function buildStats(
  workouts: Workout[],
  exercises: SportExercise[],
): ExerciseStat[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const stats = new Map<string, ExerciseStat>();

  for (const workout of workouts) {
    // Sets of the same exercise within this workout collapse to one session.
    const sessionBest = new Map<string, { best: number; count: number }>();
    for (const set of workout.sets) {
      const exercise = byId.get(set.ex);
      if (!exercise) {
        continue;
      }
      const score = setScore(set, exercise.kind);
      const running = sessionBest.get(set.ex) ?? { best: 0, count: 0 };
      sessionBest.set(set.ex, {
        best: Math.max(running.best, score),
        count: running.count + 1,
      });
    }

    for (const [exerciseId, session] of sessionBest) {
      const exercise = byId.get(exerciseId)!;
      const stat =
        stats.get(exerciseId) ??
        ({
          exercise,
          totalSets: 0,
          best: 0,
          lastAt: 0,
          sessions: [],
        } satisfies ExerciseStat);
      stat.totalSets += session.count;
      stat.best = Math.max(stat.best, session.best);
      stat.lastAt = Math.max(stat.lastAt, workout.started);
      stat.sessions.push({ time: workout.started, best: session.best, sets: session.count });
      stats.set(exerciseId, stat);
    }
  }

  for (const stat of stats.values()) {
    stat.sessions.sort((left, right) => left.time - right.time);
  }
  return [...stats.values()].sort((left, right) => right.lastAt - left.lastAt);
}

type SortKey = "last" | "name" | "sets" | "best";

function sortStats(stats: ExerciseStat[], key: SortKey): ExerciseStat[] {
  const sorted = [...stats];
  switch (key) {
    case "name":
      return sorted.sort((left, right) =>
        left.exercise.name.localeCompare(right.exercise.name),
      );
    case "sets":
      return sorted.sort((left, right) => right.totalSets - left.totalSets);
    case "best":
      return sorted.sort((left, right) => right.best - left.best);
    default:
      return sorted.sort((left, right) => right.lastAt - left.lastAt);
  }
}

// A single "how much did I do this run" number, so two runs of the same routine
// compare on one axis: total reps, plus lifted volume (kg × reps) when weight is
// used and seconds for timed holds. For a reps-only routine it is just the reps.
// ponytail: a flat sum mixes units; fine as a relative progress proxy, revisit
// if a routine ever blends heavy lifting and long holds and the scale skews.
function workoutScore(workout: Workout): number {
  return workout.sets.reduce((sum, set) => {
    const reps = set.reps ?? 0;
    return sum + reps + (set.kg ?? 0) * reps + (set.secs ?? 0);
  }, 0);
}

interface RoutineSeries {
  name: string;
  color: string;
  points: { time: number; value: number; delta: number }[];
}

// One line per routine that has been run at least twice, each point a run scored
// by [workoutScore] with its change from the previous run — so the line shows
// whether each session beat the last.
function routineComparison(
  workouts: Workout[],
  routines: Routine[],
  untitled: string,
): RoutineSeries[] {
  const nameById = new Map(routines.map((routine) => [routine.id, routine.name]));
  const runsByRoutine = new Map<string, Workout[]>();
  for (const workout of workouts) {
    const runs = runsByRoutine.get(workout.routine) ?? [];
    runs.push(workout);
    runsByRoutine.set(workout.routine, runs);
  }

  const series: RoutineSeries[] = [];
  let colorIndex = 0;
  for (const [routineId, runs] of runsByRoutine) {
    if (runs.length < 2) {
      continue;
    }
    const ordered = runs.slice().sort((left, right) => left.started - right.started);
    const points = ordered.map((workout, index) => {
      const value = workoutScore(workout);
      const previous = index > 0 ? workoutScore(ordered[index - 1]) : value;
      return { time: workout.started, value, delta: value - previous };
    });
    series.push({
      name: nameById.get(routineId) || untitled,
      color: CHART_COLORS[colorIndex % CHART_COLORS.length],
      points,
    });
    colorIndex += 1;
  }
  return series;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Sums `valueOf` into the last 12 weekly buckets (empty weeks included, so a
// training gap actually shows as a gap). Weeks start Monday.
function weeklyBuckets(
  workouts: Workout[],
  valueOf: (workout: Workout) => number,
): { time: number; value: number }[] {
  const weekCount = 12;
  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const buckets: { time: number; value: number }[] = [];
  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - offset * 7);
    buckets.push({ time: start.getTime(), value: 0 });
  }
  const indexByWeek = new Map(buckets.map((bucket, index) => [bucket.time, index]));
  for (const workout of workouts) {
    const weekStart = startOfWeek(new Date(workout.started), { weekStartsOn: 1 }).getTime();
    const index = indexByWeek.get(weekStart);
    if (index !== undefined) {
      buckets[index].value += valueOf(workout);
    }
  }
  return buckets;
}

export default function ExerciseStatsPage() {
  const { t } = useTranslation();
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });

  const workoutList = useMemo(() => workouts.data?.workouts ?? [], [workouts.data]);
  const stats = useMemo(
    () => buildStats(workoutList, exercises.data?.exercises ?? []),
    [workoutList, exercises.data],
  );

  const [selected, setSelected] = useState<ExerciseStat | null>(null);
  const [sort, setSort] = useState<SortKey>("last");
  const sortedStats = useMemo(() => sortStats(stats, sort), [stats, sort]);

  const totalSets = stats.reduce((sum, stat) => sum + stat.totalSets, 0);
  const totalReps = useMemo(
    () =>
      workoutList.reduce(
        (sum, workout) =>
          sum + workout.sets.reduce((setSum, set) => setSum + (set.reps ?? 0), 0),
        0,
      ),
    [workoutList],
  );

  const columns: ListColumn<ExerciseStat>[] = [
    { header: t("exercise_stats.col_exercise"), cell: (stat) => stat.exercise.name },
    {
      header: t("exercise_stats.col_kind"),
      cell: (stat) => t("exercises.kind_" + stat.exercise.kind),
      className: "text-muted-foreground",
    },
    {
      header: t("exercise_stats.col_sets"),
      cell: (stat) => stat.totalSets,
      className: "text-right tabular-nums",
    },
    {
      header: t("exercise_stats.col_best"),
      cell: (stat) => formatScore(stat.best, stat.exercise.kind, t),
      className: "text-right tabular-nums",
    },
    {
      header: t("exercise_stats.col_last"),
      cell: (stat) => format(new Date(stat.lastAt), "dd.MM.yyyy"),
      className: "text-right text-muted-foreground tabular-nums",
    },
  ];

  return (
    <PanelPage
      title={t("exercise_stats.title")}
      parents={[{ title: t("nav.health") }]}
    >
      <div className="flex flex-col gap-6 py-6">
        {workouts.isLoading || exercises.isLoading ? (
          <CardSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <SummaryTile label={t("exercise_stats.total_sessions")} value={workoutList.length} />
              <SummaryTile label={t("exercise_stats.total_sets")} value={totalSets} />
              <SummaryTile
                label={t("exercise_stats.total_reps")}
                value={totalReps.toLocaleString()}
              />
            </div>

            <OverviewCharts workouts={workoutList} routines={routines.data?.routines ?? []} />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold">{t("exercise_stats.per_exercise")}</h3>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last">{t("exercise_stats.sort_last")}</SelectItem>
                    <SelectItem value="name">{t("exercise_stats.sort_name")}</SelectItem>
                    <SelectItem value="sets">{t("exercise_stats.sort_sets")}</SelectItem>
                    <SelectItem value="best">{t("exercise_stats.sort_best")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DataList
                columns={columns}
                data={sortedStats}
                empty={t("exercise_stats.empty")}
                onRowClick={setSelected}
              />
            </div>
          </>
        )}
      </div>

      {selected && (
        <ExerciseDetail stat={selected} onClose={() => setSelected(null)} />
      )}
    </PanelPage>
  );
}

function SummaryTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

// The whole-training overview: how consistently you train, and how each routine
// run compares to the last.
function OverviewCharts({ workouts, routines }: { workouts: Workout[]; routines: Routine[] }) {
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
            <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
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
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">
        {format(new Date(label as number), "dd.MM.yyyy")}
      </div>
      {payload.map((entry) => {
        const delta = entry.payload?.delta ?? 0;
        const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
        return (
          <div key={entry.name} className="mt-1 text-sm font-semibold text-popover-foreground">
            <span style={{ color: entry.color }}>{entry.name}</span>
            {": "}
            {Math.round(Number(entry.value)).toLocaleString()} {achievedLabel}
            <span
              className="ml-1 text-xs font-medium"
              style={{ color: delta > 0 ? "var(--glucose-in-range)" : delta < 0 ? "var(--glucose-low)" : undefined }}
            >
              ({sign}
              {Math.abs(Math.round(delta)).toLocaleString()})
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Matches the glucose/pulse pages' styled tooltip so hovering reads the same
// everywhere, instead of Recharts' default box.
function StatTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: unknown }[];
  label?: number | string;
  formatLabel: (label: number | string | undefined, row: unknown) => string;
  formatValue: (value: number) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const first = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">{formatLabel(label, first.payload)}</div>
      <div className="text-sm font-semibold text-popover-foreground">
        {formatValue(Number(first.value))}
      </div>
    </div>
  );
}

// Per-exercise progression: the best-set score over time, so a plateau or a
// steady climb is visible at a glance.
function ExerciseDetail({ stat, onClose }: { stat: ExerciseStat; onClose: () => void }) {
  const { t } = useTranslation();
  const kind = stat.exercise.kind;
  const chartData = stat.sessions.map((session) => ({ t: session.time, value: session.best }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{stat.exercise.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile
              label={t("exercise_stats.total_sessions")}
              value={stat.sessions.length}
            />
            <SummaryTile label={t("exercise_stats.total_sets")} value={stat.totalSets} />
            <SummaryTile
              label={t("exercise_stats.best")}
              value={formatScore(stat.best, kind, t)}
            />
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("exercise_stats.progression")}
            </span>
            {chartData.length < 2 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("exercise_stats.not_enough_data")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} width={44} domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip
                    isAnimationActive={false}
                    cursor={{ stroke: "var(--border)" }}
                    content={
                      <StatTooltip
                        formatLabel={(label) => format(new Date(label as number), "dd.MM.yyyy")}
                        formatValue={(value) => formatScore(value, kind, t)}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// The kind's best-set score, in its own unit.
function formatScore(
  score: number,
  kind: SportExercise["kind"],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (score <= 0) {
    return "–";
  }
  if (kind === "weighted") {
    return `${score.toFixed(1)} kg`;
  }
  if (kind === "timed") {
    return t("exercise_stats.seconds", { n: Math.round(score) });
  }
  return t("exercise_stats.reps", { n: Math.round(score) });
}
