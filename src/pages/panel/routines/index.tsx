import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ListChecks, Play, Plus } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RoutineCard } from "./routine-card";
import { RecentWorkouts, WorkoutsPerWeek } from "./recent-workouts";
import sportService from "@/api/services/sport-service";
import { FREE_ROUTINE_ID } from "@/lib/workout";

export default function RoutinesPage() {
  const { t } = useTranslation();
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  // Polled so a workout started on the phone surfaces here without a reload.
  const active = useQuery({
    queryKey: ["active-workout"],
    queryFn: sportService.activeWorkout,
    refetchInterval: 15000,
  });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const list = routines.data?.routines ?? [];
  const workoutList = workouts.data?.workouts ?? [];
  const exerciseList = exercises.data?.exercises ?? [];
  const exerciseById = (exerciseId: string) => exerciseList.find((entry) => entry.id === exerciseId);
  const lastDone = new Map<string, number>();
  for (const workout of workoutList) {
    lastDone.set(workout.routine, Math.max(lastDone.get(workout.routine) ?? 0, workout.started));
  }
  const running = active.data?.workout;
  const runningRoutine = list.find((entry) => entry.id === running?.routine);
  // A free workout is in no list, so its name comes from the snapshot itself.
  const runningName =
    running?.routine === FREE_ROUTINE_ID
      ? t("routines.free")
      : (runningRoutine?.name ?? running?.name ?? "");

  return (
    <PanelPage title={t("routines.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader
        title={t("routines.title")}
        actions={
          <>
            <Button asChild variant="outline" className="h-10 border border-line bg-panel px-4 hover:bg-raised">
              <Link to={`/health/routines/${FREE_ROUTINE_ID}/run`}>
                <Play className="size-4" />
                {t("routines.free")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 border border-line bg-panel px-4 hover:bg-raised">
              <Link to="/health/routines/exercises">
                <ListChecks className="size-4" />
                {t("exercises.title")}
              </Link>
            </Button>
            <Button asChild className="h-10 px-4">
              <Link to="/health/routines/new">
                <Plus className="size-4" />
                {t("routines.add")}
              </Link>
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-4">
        {running && <RunningWorkoutCard routineId={running.routine} name={runningName} />}

        {routines.isLoading ? (
          <CardSkeleton />
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("routines.empty")}</p>
        ) : (
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                exerciseById={exerciseById}
                lastDone={lastDone.get(routine.id)}
              />
            ))}
          </div>
        )}
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
          <RecentWorkouts workouts={workoutList} routines={list} />
          <WorkoutsPerWeek workouts={workoutList} />
        </div>
      </div>
    </PanelPage>
  );
}

// A workout is running on this account — most likely started in the app. Opening
// the runner picks it up at the set it is on, rather than starting a new one.
// Named by id, not by a routine from the list: a free workout has none.
function RunningWorkoutCard({ routineId, name }: { routineId: string; name: string }) {
  const { t } = useTranslation();
  return (
    <Link to={`/health/routines/${routineId}/run`}>
      <Card className="flex-row items-center gap-3 px-6 py-4 transition-colors hover:bg-raised">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
          <Activity size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-sm">{t("routines.running")}</b>
          <span className="block truncate text-xs text-muted-foreground">{name || t("routines.untitled")}</span>
        </span>
        <span className={buttonVariants({ size: "sm" })}>{t("routines.continue")}</span>
      </Card>
    </Link>
  );
}
