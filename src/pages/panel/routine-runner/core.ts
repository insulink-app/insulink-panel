// The runner's session state and the pure helpers around it. Kept apart from
// the views so the state machine (use-runner-core) can be read on its own.
import type { ActiveWorkout, Routine, SetLog, Workout } from "@/api/services/sport-service";

export type Phase = "exercising" | "resting" | "done";

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
// and an out-of-range pointer would read an undefined item.
export function coreFrom(resume: ActiveWorkout | undefined, routine: Routine): Core {
  const now = Date.now();
  if (!resume) {
    const first = routine.items[0];
    return {
      phase: "exercising",
      exerciseIndex: 0,
      setIndex: 0,
      currentReps: first.target,
      currentWeight: first.weight,
      startedAt: now,
      setStartedAt: now,
      restEndsAt: null,
      restStartedAt: null,
      pausedAt: null,
      pausedTotal: 0,
      sets: [],
    };
  }
  const exerciseIndex = Math.min(Math.max(resume.ex, 0), routine.items.length - 1);
  const item = routine.items[exerciseIndex];
  return {
    // A finished workout is cleared, so a snapshot never resumes as "done".
    phase: resume.phase === "done" ? "exercising" : resume.phase,
    exerciseIndex,
    setIndex: Math.min(Math.max(resume.set, 0), Math.max(item.sets - 1, 0)),
    currentReps: resume.reps,
    currentWeight: resume.weight,
    startedAt: resume.started,
    setStartedAt: resume.setStarted,
    restEndsAt: resume.restEnds,
    restStartedAt: resume.restStarted,
    // The snapshot carries the paused total, not a paused-since stamp, so a
    // workout paused on the phone resumes running here — the same way the app
    // resumes its own snapshot after a restart.
    pausedAt: null,
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
    reps: core.currentReps,
    weight: core.currentWeight,
    sets: core.sets,
  };
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
