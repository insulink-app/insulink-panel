import type { Workout } from "@/api/services/sport-service";

// The concrete figures of one completed workout, shown beneath the summary's
// headline ring — the headline itself is `effortRatioVsPrevious`. Mirrors the
// app's WorkoutSummary.
export interface WorkoutSummary {
  sets: number;
  exercises: number;
  durationSecs: number;
}

export function summarize(workout: Workout): WorkoutSummary {
  const exercises = new Set(workout.sets.map((set) => set.ex)).size;
  const lastTs =
    workout.sets.length > 0 ? workout.sets[workout.sets.length - 1].ts : workout.started;
  const durationSecs =
    workout.sets.length > 0 ? Math.floor((lastTs - workout.started) / 1000) : 0;
  return { sets: workout.sets.length, exercises, durationSecs };
}

// How this workout compares with `previous` as ONE ratio (1.0 = the same, 1.1 =
// a tenth better), for the summary's headline ring.
//
// Each exercise is measured against its own last time and the ratios are then
// averaged, so every exercise counts the same. Dividing the two workouts' TOTAL
// effort instead lets whichever exercise happens to carry the most reps decide
// the number on its own: three more reps of a 100-rep exercise outweigh doubling
// a heavy 5-rep one, and the figure stops saying anything about how the session
// actually went.
//
// Only exercises done in BOTH workouts count. A new one has nothing to compare
// against, and one left out this time would read as -100 % and sink the whole
// figure. Null when the two share none — there is nothing to say. Mirrors the
// app's `effortRatioVsPrevious`.
export function effortRatioVsPrevious(current: Workout, previous: Workout) {
  const before = effortByExercise(previous);
  const ratios: number[] = [];
  for (const [exerciseId, effort] of effortByExercise(current)) {
    const base = before.get(exerciseId);
    if (base != null && base > 0) {
      ratios.push(effort / base);
    }
  }
  if (ratios.length === 0) {
    return null;
  }
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

// Effort (reps + held seconds) per exercise of one workout.
function effortByExercise(workout: Workout) {
  const byExercise = new Map<string, number>();
  for (const set of workout.sets) {
    const effort = (set.reps ?? 0) + (set.secs ?? 0);
    byExercise.set(set.ex, (byExercise.get(set.ex) ?? 0) + effort);
  }
  return byExercise;
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
