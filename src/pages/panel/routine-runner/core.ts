// The runner's session state and the pure helpers around it. Kept apart from
// the views so the state machine (use-runner-core) can be read on its own.
import type {
  ActiveWorkout,
  Routine,
  SetLog,
  SportExercise,
  Workout,
} from "@/api/services/sport-service";
import { FREE_ROUTINE_ID } from "@/lib/workout";

export type Phase = "exercising" | "resting" | "done";

// A free workout has no routine page to go back to (it is not in the library),
// so leaving one lands on the routine list instead.
export function routineHome(routineId: string) {
  return routineId === FREE_ROUTINE_ID ? "/health/routines" : `/health/routines/${routineId}`;
}

export type Core = {
  phase: Phase;
  exerciseIndex: number;
  setIndex: number;
  currentReps: number;
  currentWeight: number;
  startedAt: number;
  setStartedAt: number;
  restEndsAt: number | null;
  restStartedAt: number | null;
  pausedAt: number | null;
  pausedTotal: number;
  sets: SetLog[];
};

// Seeds the runner: from the account's running workout when the app (or another
// tab) already started this routine, otherwise a fresh session. The pointers are
// clamped because the routine may have been shortened since the workout began,
// and an out-of-range pointer would read an undefined item. A free workout
// legitimately has no items at all until its first exercise is picked, so every
// read of one is optional.
export function coreFrom(resume: ActiveWorkout | undefined, routine: Routine): Core {
  const now = Date.now();
  if (!resume) {
    const first = routine.items[0];
    return {
      phase: "exercising",
      exerciseIndex: 0,
      setIndex: 0,
      currentReps: first?.target ?? 0,
      currentWeight: first?.weight ?? 0,
      startedAt: now,
      setStartedAt: now,
      restEndsAt: null,
      restStartedAt: null,
      pausedAt: null,
      pausedTotal: 0,
      sets: [],
    };
  }
  const exerciseIndex = Math.min(Math.max(resume.ex, 0), Math.max(routine.items.length - 1, 0));
  const item = routine.items[exerciseIndex];
  return {
    // A finished workout is cleared, so a snapshot never resumes as "done".
    phase: resume.phase === "done" ? "exercising" : resume.phase,
    exerciseIndex,
    setIndex: Math.min(Math.max(resume.set, 0), Math.max((item?.sets ?? 1) - 1, 0)),
    currentReps: resume.reps,
    currentWeight: resume.weight,
    startedAt: resume.started,
    setStartedAt: resume.setStarted,
    restEndsAt: resume.restEnds,
    restStartedAt: resume.restStarted,
    // A workout paused on the phone stays paused here: the clocks read
    // `pausedAt` as their "now", so without it this screen would keep counting
    // while the other one sits still.
    pausedAt: resume.pausedAt ?? null,
    pausedTotal: resume.paused,
    sets: resume.sets,
  };
}

export function snapshotOf(core: Core, routine: Routine): ActiveWorkout {
  return {
    routine: routine.id,
    // Carry the routine so a follower (the app) resolves the exercise/set/target
    // by the driver's own copy, not by indexing its possibly-divergent one.
    name: routine.name,
    items: routine.items,
    started: core.startedAt,
    ex: core.exerciseIndex,
    set: core.setIndex,
    phase: core.phase,
    setStarted: core.setStartedAt,
    restEnds: core.restEndsAt,
    restStarted: core.restStartedAt,
    paused: core.pausedTotal,
    pausedAt: core.pausedAt,
    reps: core.currentReps,
    weight: core.currentWeight,
    sets: core.sets,
  };
}

// Whether a snapshot the account handed us is news for this tab: written after
// what it last saw (`updated` beats `known`), and holding something other than
// what it already shows. The comparison goes through our own state because the
// account re-serializes the snapshot in its own key order — and because one
// equal to what we hold is our own push coming back, which must not restart the
// session. Pure and exported so the decision can be checked without a browser:
// it is the single step between the two screens, and a snapshot wrongly read as
// "our own" is exactly how a pause made on the phone never arrives here.
export function shouldAdopt(
  remote: ActiveWorkout,
  routine: Routine,
  payload: string,
  updated: number,
  known: number,
) {
  if (updated <= known) {
    return false;
  }
  return JSON.stringify(snapshotOf(coreFrom(remote, routine), routine)) !== payload;
}

// What the routine plans for: each set costs ~1 min of work (or its target
// seconds for a timed exercise) plus its rest. Mirrors the app's
// `plannedRoutineSeconds` — it stands in for the pace before the first set is
// logged and has nothing to extrapolate from.
export function plannedRoutineSeconds(
  routine: Routine,
  exerciseById: (id: string) => SportExercise | undefined,
) {
  return routine.items.reduce((seconds, item) => {
    const perSet = exerciseById(item.ex)?.kind === "timed" ? item.target : 60;
    return seconds + item.sets * (perSet + item.rest);
  }, 0);
}

// How much longer the workout is expected to run (seconds), or null when there
// is no plan to predict against: a free workout, or one already finished.
// Extrapolates THIS session's own pace — elapsed time per logged set — so it
// corrects itself as the workout goes and needs no model of rests or pauses.
//
// ponytail: one average across all sets, not one per exercise — a routine mixing
// 30 s planks with 3 min squat sets predicts coarsely. Weight the remaining sets
// by their planned cost if that ever matters.
export function remainingSeconds(
  core: Core,
  routine: Routine,
  exerciseById: (id: string) => SportExercise | undefined,
  clock: number,
) {
  if (routine.id === FREE_ROUTINE_ID || core.phase === "done") {
    return null;
  }
  const planned = routine.items.reduce((sum, item) => sum + item.sets, 0);
  const left = planned - core.sets.length;
  if (left <= 0) {
    return 0;
  }
  if (core.sets.length === 0) {
    return plannedRoutineSeconds(routine, exerciseById);
  }
  const elapsed = Math.max(0, (clock - core.startedAt - core.pausedTotal) / 1000);
  return Math.round((elapsed / core.sets.length) * left);
}

// Whether a free workout has done everything it was told to and is waiting to be
// told what comes next — the rest after its last set, where the runner asks for
// the next exercise instead of offering to carry on.
//
// Derived, not stored: a free workout plans one set per exercise, so having
// logged at least as many sets as it planned means the plan is spent. That keeps
// it true for a follower reading the snapshot too. Mirrors the app's
// `WorkoutRunner.awaitingNextExercise`.
export function awaitsNextExercise(core: Core, routine: Routine) {
  if (routine.id !== FREE_ROUTINE_ID || core.phase !== "resting") {
    return false;
  }
  const planned = routine.items.reduce((sum, item) => sum + item.sets, 0);
  return core.sets.length >= planned;
}

export function clamp(value: number) {
  return Math.max(0, Math.min(999, value));
}

// Reps are whole. The number input happily yields "12.5", and the app decodes
// reps as an int — a fractional value makes its parse of the snapshot we push
// (and of the saved workout) throw, on the phone, with no clue why.
export function clampReps(value: number) {
  return Math.round(clamp(value));
}

// The setIndex-th set of `exerciseId` from the most recent past session that has
// one — the "last time" comparison.
export function findLastSet(workouts: Workout[], exerciseId: string, setIndex: number) {
  const sessions = workouts.slice().sort((left, right) => right.started - left.started);
  for (const session of sessions) {
    const matching = session.sets.filter((set) => set.ex === exerciseId);
    if (matching.length > setIndex) {
      return matching[setIndex];
    }
  }
  return undefined;
}

export function describeSet(
  set: SetLog,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (set.secs != null && set.reps == null) {
    return formatClock(set.secs);
  }
  const reps = set.reps ?? 0;
  if (set.kg != null && set.kg > 0) {
    return `${reps} × ${set.kg} ${t("body.kg")}`;
  }
  return String(reps);
}

// Stopwatch/countdown reading: "m:ss", growing to "h:mm:ss" past the hour.
export function formatClock(totalSeconds: number) {
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => value.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}
