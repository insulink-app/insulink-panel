import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
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
import { SummaryTile } from "./shared";
import { OverviewCharts } from "./overview-charts";
import { ExerciseDetail } from "./exercise-detail";

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
        (sum, workout) => sum + workout.sets.reduce((setSum, set) => setSum + (set.reps ?? 0), 0),
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
    <PanelPage title={t("exercise_stats.title")} parents={[{ title: t("nav.health") }]}>
      <div className="flex flex-col gap-6 py-6">
        {workouts.isLoading || exercises.isLoading ? (
          <CardSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <SummaryTile label={t("exercise_stats.total_sessions")} value={workoutList.length} />
              <SummaryTile label={t("exercise_stats.total_sets")} value={totalSets} />
              <SummaryTile label={t("exercise_stats.total_reps")} value={totalReps.toLocaleString()} />
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

      {selected && <ExerciseDetail stat={selected} onClose={() => setSelected(null)} />}
    </PanelPage>
  );
}
