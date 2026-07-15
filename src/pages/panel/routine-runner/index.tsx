import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pause, Play } from "lucide-react";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import sportService, {
  type ActiveWorkout,
  type Routine,
  type SportExercise,
  type Workout,
} from "@/api/services/sport-service";
import { findLastSet, formatClock } from "./core";
import { RunnerShell } from "./runner-shell";
import { ExerciseView } from "./exercise-view";
import { RestView } from "./rest-view";
import { VitalsTiles } from "./vitals-tiles";
import { useRunnerCore } from "./use-runner-core";
import { useWorkoutSync } from "./use-workout-sync";

export default function RoutineRunnerPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  // Settled before mounting the runner: it seeds its state from this once, so
  // arriving late would start a second workout over the one already running.
  const active = useQuery({ queryKey: ["active-workout"], queryFn: sportService.activeWorkout });

  const routine = routines.data?.routines?.find((entry) => entry.id === id);

  if (routines.isLoading || exercises.isLoading || active.isLoading) {
    return (
      <RunnerShell>
        <CardSkeleton />
      </RunnerShell>
    );
  }
  if (!routine || routine.items.length === 0) {
    return (
      <RunnerShell>
        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("common.no_data")}
        </p>
      </RunnerShell>
    );
  }

  const running = active.data?.workout;
  return (
    <Runner
      routine={routine}
      exercises={exercises.data?.exercises ?? []}
      pastWorkouts={workouts.data?.workouts ?? []}
      resumeFrom={running?.routine === routine.id ? running : undefined}
    />
  );
}

function Runner({
  routine,
  exercises,
  pastWorkouts,
  resumeFrom,
}: {
  routine: Routine;
  exercises: SportExercise[];
  pastWorkouts: Workout[];
  resumeFrom?: ActiveWorkout;
}) {
  const { t } = useTranslation();
  const exerciseById = useCallback(
    (exerciseId: string) => exercises.find((entry) => entry.id === exerciseId),
    [exercises],
  );

  const runner = useRunnerCore({ routine, resumeFrom, exerciseById });
  const { core, clock } = runner;
  useWorkoutSync({ core, routine, pastWorkouts });

  const item = routine.items[core.exerciseIndex];
  const exercise = exerciseById(item.ex);
  const plannedSets = routine.items.reduce((sum, entry) => sum + entry.sets, 0);
  const progress = plannedSets === 0 ? 0 : Math.min(1, core.sets.length / plannedSets);

  const setElapsed = Math.max(0, Math.floor((clock - core.setStartedAt) / 1000));
  const restRemaining =
    core.restEndsAt != null ? Math.max(0, Math.round((core.restEndsAt - clock) / 1000)) : 0;
  const restOvertime =
    core.restEndsAt != null ? Math.max(0, Math.round((clock - core.restEndsAt) / 1000)) : 0;
  const sessionElapsed = Math.max(0, Math.floor((clock - core.startedAt - core.pausedTotal) / 1000));

  const lastComparable = useMemo(
    () => findLastSet(pastWorkouts, item.ex, core.setIndex),
    [pastWorkouts, item.ex, core.setIndex],
  );

  const lastSet = core.sets[core.sets.length - 1];

  return (
    <RunnerShell routineId={routine.id} routineName={routine.name || t("routines.untitled")}>
      <div className="flex flex-col gap-4">
        {/* The elapsed time is the anchor, so it sits centred. The pause button
            is parked at the edge rather than laid out beside it — in a row the
            time would drift off-centre as digits are added. */}
        <div className="relative flex flex-col items-center gap-1">
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            {t("routines.total")}
          </span>
          <span className="text-6xl leading-none font-bold tracking-tight tabular-nums">
            {formatClock(sessionElapsed)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-0 size-12 -translate-y-1/2 rounded-full"
            aria-label={core.pausedAt ? t("routines.resume") : t("routines.pause")}
            onClick={() => (core.pausedAt ? runner.resume() : runner.pause())}
          >
            {core.pausedAt ? <Play className="size-7" /> : <Pause className="size-7" />}
          </Button>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <VitalsTiles />
      </div>

      {core.phase === "done" ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : core.phase === "resting" ? (
        <RestView
          expired={restRemaining === 0}
          remaining={restRemaining}
          overtime={restOvertime}
          nextName={exercise?.name ?? "—"}
          setNumber={core.setIndex + 1}
          totalSets={item.sets}
          items={routine.items}
          exerciseById={exerciseById}
          onJump={runner.jumpTo}
          lastSet={lastSet}
          onUpdateLast={runner.updateLastSet}
          onExtend={() => runner.extendRest(60)}
          onContinue={runner.skipRest}
          onFinish={runner.finishEarly}
        />
      ) : (
        <ExerciseView
          name={exercise?.name ?? "—"}
          exerciseIndex={core.exerciseIndex}
          totalExercises={routine.items.length}
          setNumber={core.setIndex + 1}
          totalSets={item.sets}
          elapsed={setElapsed}
          isTimed={exercise?.kind === "timed"}
          isWeighted={exercise?.kind === "weighted"}
          targetSecs={item.target}
          reps={core.currentReps}
          weight={core.currentWeight}
          onReps={runner.recordReps}
          onWeight={runner.adjustWeight}
          lastComparable={lastComparable}
          items={routine.items}
          exerciseById={exerciseById}
          onJump={runner.jumpTo}
          onComplete={runner.completeSet}
          onFinish={runner.finishEarly}
        />
      )}
    </RunnerShell>
  );
}
