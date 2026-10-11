import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { CardSkeleton } from "@/components/card-skeleton";
import { Spinner } from "@/components/ui/spinner";
import sportService, {
  type ActiveWorkout,
  type Routine,
  type SportExercise,
  type Workout,
} from "@/api/services/sport-service";
import { FREE_ROUTINE_ID } from "@/lib/workout";
import { newId } from "../routines/shared";
import { AddExerciseDialog } from "./controls";
import { SessionHeader, SessionTimeline } from "./session-bar";
import { awaitsNextExercise, findLastSet, remainingSeconds, segmentFill } from "./core";
import { RunnerShell } from "./runner-shell";
import { ExerciseView } from "./exercise-view";
import { RestView } from "./rest-view";
import { VitalsTiles } from "./vitals-tiles";
import { ExerciseRail } from "./exercise-rail";
import { useSessionRoutine } from "./use-session-routine";
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

  const session = useSessionRoutine(stored);
  const { routine } = session;
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
    session.add(item);
    if (routine.items.length === 0 || awaitingNext) {
      runner.startAdded(routine.items.length, item);
    }
  };

  // Skip and swap act on the current exercise, or while resting on the one
  // coming up. Neither applies while a free workout waits for its next pick:
  // there the pointers still sit on the exercise just finished.
  const canSkip = !awaitingNext && core.exerciseIndex + 1 < routine.items.length;
  const canSwap = !awaitingNext && routine.items[core.exerciseIndex] != null;
  const skipExercise = () => runner.jumpTo(core.exerciseIndex + 1);
  const swapExercise = (exerciseId: string) => {
    const replaced = routine.items[core.exerciseIndex];
    const item = { ...replaced, id: newId(), ex: exerciseId };
    session.swap(replaced.id, item);
    runner.swapIn(item);
  };

  const item = routine.items[core.exerciseIndex];
  const exercise = item ? exerciseById(item.ex) : undefined;
  const plannedSets = routine.items.reduce((sum, entry) => sum + entry.sets, 0);

  const setElapsed = Math.max(0, Math.floor((clock - core.setStartedAt) / 1000));
  const restRemaining =
    core.restEndsAt != null ? Math.max(0, Math.round((core.restEndsAt - clock) / 1000)) : 0;
  const restOvertime =
    core.restEndsAt != null ? Math.max(0, Math.round((clock - core.restEndsAt) / 1000)) : 0;
  const restTotal =
    core.restEndsAt != null && core.restStartedAt != null
      ? Math.round((core.restEndsAt - core.restStartedAt) / 1000)
      : 0;
  const sessionElapsed = Math.max(0, Math.floor((clock - core.startedAt - core.pausedTotal) / 1000));
  // Read against the wall clock, not `clock`: a paused workout's predicted end
  // keeps moving out, which is exactly what pausing does to it.
  const remaining = remainingSeconds(core, routine, exerciseById, clock);
  const expectedEnd = remaining == null ? null : new Date(Date.now() + remaining * 1000);

  const lastComparable = useMemo(
    () =>
      item && !awaitingNext
        ? findLastSet(pastWorkouts, routine.id, item.ex, core.setIndex)
        : undefined,
    [pastWorkouts, routine.id, item, core.setIndex, awaitingNext],
  );

  const lastSet = core.sets[core.sets.length - 1];

  return (
    <RunnerShell
      routineId={routine.id === FREE_ROUTINE_ID ? undefined : routine.id}
      routineName={routine.name || t("routines.untitled")}
    >
      <SessionHeader
        name={routine.name || t("routines.untitled")}
        exerciseNumber={Math.min(core.exerciseIndex + 1, routine.items.length)}
        totalExercises={routine.items.length}
        doneSets={core.sets.length}
        plannedSets={plannedSets}
        paused={core.pausedAt != null}
        onPause={runner.pause}
        onResume={runner.resume}
        onFinish={runner.finishEarly}
      />
      <SessionTimeline
        elapsed={sessionElapsed}
        items={routine.items}
        exerciseIndex={core.exerciseIndex}
        currentFill={item ? segmentFill(core, item, exercise?.kind === "timed", clock) : 0}
        doneSets={core.sets.length}
        plannedSets={plannedSets}
        expectedEnd={expectedEnd && format(expectedEnd, "HH:mm")}
      />
      {/* Three columns from 1300 px: the outer two are equally wide, so the
          stage stays exactly centred. Below that they stack. No cards: the
          hairlines between the columns run to the bottom. */}
      <div className="mt-8 grid flex-1 grid-cols-1 min-[1300px]:min-h-[640px] min-[1300px]:grid-cols-[340px_minmax(0,1fr)_340px]">
        <div className="min-w-0 border-divider min-[1300px]:border-r min-[1300px]:pr-8">
          <VitalsTiles />
        </div>
        <div className="flex min-w-0 flex-col justify-center border-t border-divider py-10 min-[1300px]:border-t-0 min-[1300px]:px-10 min-[1300px]:pt-0 min-[1300px]:pb-12">
          {core.phase === "done" ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : !item ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-lg text-muted-foreground">{t("routines.no_exercise_yet")}</p>
              <AddExerciseDialog exercises={exercises} onAdd={addExercise} className="w-auto" />
            </div>
          ) : core.phase === "resting" ? (
            <RestView
              expired={restRemaining === 0}
              remaining={restRemaining}
              overtime={restOvertime}
              total={restTotal}
              endsAt={core.restEndsAt}
              paused={core.pausedAt != null}
              items={routine.items}
              exercises={exercises}
              exerciseById={exerciseById}
              onJump={runner.jumpTo}
              onAddExercise={addExercise}
              awaitingNext={awaitingNext}
              lastComparable={lastComparable}
              lastSet={lastSet}
              onUpdateLast={runner.updateLastSet}
              onExtend={() => runner.extendRest(60)}
              onContinue={runner.skipRest}
            />
          ) : (
            <ExerciseView
              name={exercise?.name ?? "—"}
              exerciseIndex={core.exerciseIndex}
              setNumber={core.setIndex + 1}
              elapsed={setElapsed}
              isTimed={exercise?.kind === "timed"}
              isWeighted={exercise?.kind === "weighted"}
              targetSecs={item.target}
              reps={core.currentReps}
              weight={core.currentWeight}
              onReps={runner.recordReps}
              onWeight={runner.adjustWeight}
              lastComparable={lastComparable}
              onComplete={runner.completeSet}
            />
          )}
        </div>
        <div className="min-w-0 border-t border-divider pt-6 min-[1300px]:border-t-0 min-[1300px]:border-l min-[1300px]:pt-0 min-[1300px]:pl-8">
          {core.phase !== "done" && routine.items.length > 0 && (
            <ExerciseRail
              items={routine.items}
              exerciseIndex={core.exerciseIndex}
              setIndex={core.setIndex}
              resting={core.phase === "resting"}
              sets={core.sets}
              exercises={exercises}
              exerciseById={exerciseById}
              canSkip={canSkip}
              canSwap={canSwap}
              onSkip={skipExercise}
              onSwap={swapExercise}
              onJump={runner.jumpTo}
              onAdd={addExercise}
            />
          )}
        </div>
      </div>
    </RunnerShell>
  );
}
