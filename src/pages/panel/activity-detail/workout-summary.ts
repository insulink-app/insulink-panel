import type { Workout } from "@/api/services/sport-service";

// The headline numbers of one completed workout. `effort` — total reps plus held
// seconds across all sets — is the overall training value: a single weight-free
// figure that is non-zero for any real session (reps for rep/weighted exercises,
// seconds for timed ones), so it works for bodyweight routines too and drives the
// "vs. last time" ring. `exercises`, `sets` and `durationSecs` are the concrete
// figures shown beneath it. Mirrors the app's WorkoutSummary.
export interface WorkoutSummary {
  sets: number;
  exercises: number;
  effort: number;
  durationSecs: number;
}

export function summarize(workout: Workout): WorkoutSummary {
  const exercises = new Set(workout.sets.map((set) => set.ex)).size;
  const effort = workout.sets.reduce(
    (sum, set) => sum + (set.reps ?? 0) + (set.secs ?? 0),
    0,
  );
  const lastTs =
    workout.sets.length > 0 ? workout.sets[workout.sets.length - 1].ts : workout.started;
  const durationSecs =
    workout.sets.length > 0 ? Math.floor((lastTs - workout.started) / 1000) : 0;
  return { sets: workout.sets.length, exercises, effort, durationSecs };
}

// The workout of the same routine logged right before `workout` — the one to
// compare a summary against. Undefined when it is the first of its routine.
// Compares by start time, not list order, so an edited/re-synced logbook still
// finds the true predecessor.
export function previousWorkout(all: Workout[], workout: Workout): Workout | undefined {
  let previous: Workout | undefined;
  for (const other of all) {
    if (other.routine !== workout.routine || other.started >= workout.started) {
      continue;
    }
    if (!previous || other.started > previous.started) {
      previous = other;
    }
  }
  return previous;
}
