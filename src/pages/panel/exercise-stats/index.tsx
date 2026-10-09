import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { KpiStrip } from "@/components/kpi-strip";
import { Segmented } from "@/components/segmented";
import { formatDay } from "@/lib/when";
import { formatNumber } from "@/lib/format";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { subMonths } from "date-fns";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { DataList, type ListColumn } from "@/components/data-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import sportService from "@/api/services/sport-service";
import { buildStats, formatScore, sortStats, type ExerciseStat, type SortKey } from "./stats";
import { OverviewCharts } from "./overview-charts";
import { ExerciseDetail } from "./exercise-detail";

export default function ExerciseStatsPage() {
  const { t, i18n } = useTranslation();
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });

  const [span, setSpan] = useState<Span>("12w");
  const workoutList = useMemo(() => {
    const since = spanStart(span, workouts.data?.workouts ?? []);
    return (workouts.data?.workouts ?? []).filter((workout) => workout.started >= since);
  }, [workouts.data, span]);
  const weekCount = Math.max(1, Math.ceil((Date.now() - spanStart(span, workoutList)) / WEEK));
  const stats = useMemo(
    () => buildStats(workoutList, exercises.data?.exercises ?? []),
    [workoutList, exercises.data],
  );

  const [selected, setSelected] = useState<ExerciseStat | null>(null);
  const [sort, setSort] = useState<SortKey>("last");
  const sortedStats = useMemo(() => sortStats(stats, sort), [stats, sort]);

  const maxSets = Math.max(1, ...stats.map((stat) => stat.totalSets));
  const totalSets = stats.reduce((sum, stat) => sum + stat.totalSets, 0);
  const totalReps = useMemo(
    () =>
      workoutList.reduce(
        (sum, workout) => sum + workout.sets.reduce((setSum, set) => setSum + (set.reps ?? 0), 0),
        0,
      ),
    [workoutList],
  );

  const columns: ListColumn<ExerciseStat>[] = [
    { header: t("exercise_stats.col_exercise"), cell: (stat) => <b>{stat.exercise.name}</b> },
    {
      header: t("exercise_stats.col_sets"),
      cell: (stat) => <SetsBar sets={stat.totalSets} max={maxSets} />,
      className: "w-[45%]",
    },
    {
      header: t("exercise_stats.col_best"),
      cell: (stat) => formatScore(stat.best, stat.exercise.kind, t),
    },
    {
      header: t("exercise_stats.col_last"),
      cell: (stat) => formatDay(stat.lastAt, t, i18n.language),
      className: "text-right text-muted-foreground",
    },
  ];

  return (
    <PanelPage title={t("exercise_stats.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader
        title={t("exercise_stats.title")}
        actions={
          <Segmented
            label={t("overview.range")}
            value={span}
            onChange={setSpan}
            className="bg-panel"
            options={[
              { value: "4w", label: t("exercise_stats.span_weeks", { n: 4 }) },
              { value: "12w", label: t("exercise_stats.span_weeks", { n: 12 }) },
              { value: "6m", label: t("exercise_stats.span_months", { n: 6 }) },
              { value: "all", label: t("exercise_stats.span_all") },
            ]}
          />
        }
      />
      <div className="flex flex-col gap-4">
        {workouts.isLoading || exercises.isLoading ? (
          <CardSkeleton />
        ) : (
          <>
            <div className="mb-2">
              <KpiStrip
                cells={[
                  { label: t("exercise_stats.total_sessions"), value: formatNumber(workoutList.length) },
                  { label: t("exercise_stats.total_sets"), value: formatNumber(totalSets) },
                  { label: t("exercise_stats.total_reps"), value: formatNumber(totalReps) },
                  {
                    label: t("exercise_stats.per_week"),
                    value: formatNumber(workoutList.length / weekCount, 1),
                    unit: t("exercise_stats.unit_workouts"),
                  },
                ]}
              />
            </div>

            <OverviewCharts workouts={workoutList} routines={routines.data?.routines ?? []} weekCount={Math.min(weekCount, 26)} />

            <DataList
              title={t("exercise_stats.per_exercise")}
              action={
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger size="sm" className="w-44" aria-label={t("exercise_stats.sort_label")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last">{t("exercise_stats.sort_last")}</SelectItem>
                    <SelectItem value="name">{t("exercise_stats.sort_name")}</SelectItem>
                    <SelectItem value="sets">{t("exercise_stats.sort_sets")}</SelectItem>
                    <SelectItem value="best">{t("exercise_stats.sort_best")}</SelectItem>
                  </SelectContent>
                </Select>
              }
              columns={columns}
              data={sortedStats}
              empty={t("exercise_stats.empty")}
              onRowClick={setSelected}
            />
          </>
        )}
      </div>

      {selected && <ExerciseDetail stat={selected} onClose={() => setSelected(null)} />}
    </PanelPage>
  );
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

type Span = "4w" | "12w" | "6m" | "all";

/** Where a span starts; "all" starts at the first workout. */
function spanStart(span: Span, workouts: { started: number }[]) {
  switch (span) {
    case "4w":
      return Date.now() - 4 * WEEK;
    case "12w":
      return Date.now() - 12 * WEEK;
    case "6m":
      return subMonths(new Date(), 6).getTime();
    case "all":
      return Math.min(Date.now(), ...workouts.map((workout) => workout.started));
  }
}

/** The set count with a bar scaled to the exercise with the most sets. */
function SetsBar({ sets, max }: { sets: number; max: number }) {
  return (
    <span className="flex items-center gap-3">
      <b className="w-8 shrink-0 text-right">{sets}</b>
      <span className="block h-1.5 flex-1 overflow-hidden rounded-[3px] bg-ground" aria-hidden>
        <i className="block h-full rounded-[3px] bg-primary" style={{ width: `${(sets / max) * 100}%` }} />
      </span>
    </span>
  );
}
