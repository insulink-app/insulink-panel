import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Pause, Play } from "@/components/icons";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import sportService, {
  type ActiveWorkout,
  type Routine,
  type RoutineItem,
  type SportExercise,
  type Workout,
} from "@/api/services/sport-service";
import { FREE_ROUTINE_ID } from "@/lib/workout";
import { newId } from "../routines/shared";
import { AddExerciseDialog, FinishButton } from "./controls";
import { awaitsNextExercise, findLastSet, formatClock, remainingSeconds } from "./core";
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

  const localRoutine = routines.data?.routines?.find((entry) => entry.id === id);
  // A free workout has no stored routine behind it: its exercises are picked
  // while it runs, so it starts empty and is never looked up in the library.
  const isFree = id === FREE_ROUTINE_ID;

  if (routines.isLoading || exercises.isLoading || active.isLoading || workouts.isLoading) {
    return (
      <RunnerShell>
        <CardSkeleton />
      </RunnerShell>
    );
  }

  // Resume a running workout for this routine. Prefer the driver's embedded copy
  // of the routine (ordered items + name) over our own, so a workout started on
  // the phone renders the exercise/set/target that device is on even when our
  // copy differs or is missing entirely. Falls back to the local routine.
  const running = active.data?.workout;
  // A running workout whose session is already in the logbook is over: the
  // device that finished it lost its `clear`. Resuming it would log the same
  // workout a second time under the same id (the id IS its start), so it is
  // ignored and this page starts a fresh workout instead.
  const logged = workouts.data?.workouts?.some((entry) => entry.started === running?.started);
  const resumeFrom = running?.routine === id && !logged ? running : undefined;
  const routine: Routine | undefined = isFree
    ? { id: FREE_ROUTINE_ID, name: t("routines.free"), items: resumeFrom?.items ?? [] }
    : resumeFrom?.items && resumeFrom.items.length > 0
      ? { id: id!, name: resumeFrom.name ?? localRoutine?.name ?? "", items: resumeFrom.items }
      : localRoutine;

  if (!routine || (routine.items.length === 0 && !isFree)) {
    return (
      <RunnerShell>
        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("common.no_data")}
        </p>
      </RunnerShell>
    );
  }

  return (
    <Runner
      routine={routine}
      exercises={exercises.data?.exercises ?? []}
      pastWorkouts={workouts.data?.workouts ?? []}
      resumeFrom={resumeFrom}
    />
  );
}

function Runner({
  routine: stored,
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

  // Exercises picked while the workout runs: they belong to THIS session, so the
  // stored routine keeps its own items. They ride along until the account's copy
  // carries them itself — the snapshot pushed below comes back embedding the
  // items, and one already there is dropped here rather than added twice.
  const [added, setAdded] = useState<RoutineItem[]>([]);
  const routine = useMemo<Routine>(
    () => ({
      ...stored,
      items: [
        ...stored.items,
        ...added.filter((item) => !stored.items.some((entry) => entry.id === item.id)),
      ],
    }),
    [stored, added],
  );
  const runner = useRunnerCore({ routine, resumeFrom, exerciseById });
  const { core, clock } = runner;
  useWorkoutSync({ core, adopt: runner.adopt, routine, pastWorkouts });

  // A free workout is picked exercise by exercise as it goes: one set and a
  // two-minute rest, then the question what comes next. Planning three sets
  // ahead would have the user repeating an exercise they meant to do once. An
  // extra exercise in a real routine keeps the editor's defaults — there it IS
  // part of a plan.
  const free = routine.id === FREE_ROUTINE_ID;
  const awaitingNext = awaitsNextExercise(core, routine);
  const addExercise = (exerciseId: string) => {
    const item = {
      id: newId(),
      ex: exerciseId,
      sets: free ? 1 : 3,
      target: 10,
      weight: 0,
      rest: free ? 120 : 60,
    };
    setAdded((current) => [...current, item]);
    if (routine.items.length === 0 || awaitingNext) {
      runner.startAdded(routine.items.length, item);
    }
  };

  const item = routine.items[core.exerciseIndex];
  const exercise = item ? exerciseById(item.ex) : undefined;
  const plannedSets = routine.items.reduce((sum, entry) => sum + entry.sets, 0);
  const progress = plannedSets === 0 ? 0 : Math.min(1, core.sets.length / plannedSets);

  const setElapsed = Math.max(0, Math.floor((clock - core.setStartedAt) / 1000));
  const restRemaining =
    core.restEndsAt != null ? Math.max(0, Math.round((core.restEndsAt - clock) / 1000)) : 0;
  const restOvertime =
    core.restEndsAt != null ? Math.max(0, Math.round((clock - core.restEndsAt) / 1000)) : 0;
  const sessionElapsed = Math.max(0, Math.floor((clock - core.startedAt - core.pausedTotal) / 1000));
  // Read against the wall clock, not `clock`: a paused workout's predicted end
  // keeps moving out, which is exactly what pausing does to it.
  const remaining = remainingSeconds(core, routine, exerciseById, clock);
  const expectedEnd = remaining == null ? null : new Date(Date.now() + remaining * 1000);

  const lastComparable = useMemo(
    () => (item ? findLastSet(pastWorkouts, item.ex, core.setIndex) : undefined),
    [pastWorkouts, item, core.setIndex],
  );

  const lastSet = core.sets[core.sets.length - 1];

  return (
    <RunnerShell
      routineId={routine.id === FREE_ROUTINE_ID ? undefined : routine.id}
      routineName={routine.name || t("routines.untitled")}
    >
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
          {expectedEnd && (
            <span className="text-sm text-muted-foreground">
              {t("routines.eta", { time: format(expectedEnd, "HH:mm") })}
            </span>
          )}
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
      ) : !item ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg text-muted-foreground">{t("routines.no_exercise_yet")}</p>
          <AddExerciseDialog exercises={exercises} onAdd={addExercise} />
          <FinishButton onFinish={runner.finishEarly} />
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
          exercises={exercises}
          exerciseById={exerciseById}
          onJump={runner.jumpTo}
          onAddExercise={addExercise}
          awaitingNext={awaitingNext}
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
          exercises={exercises}
          exerciseById={exerciseById}
          onJump={runner.jumpTo}
          onAddExercise={addExercise}
          onComplete={runner.completeSet}
          onFinish={runner.finishEarly}
        />
      )}
    </RunnerShell>
  );
}
