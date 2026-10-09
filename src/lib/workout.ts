// Naming a logged workout across the panel.
import type { Workout } from "@/api/services/sport-service";

export const FREE_ROUTINE_ID = "free";

// What a logged workout is called wherever it is listed: its routine's name, the
// free-training label when it ran without one (a free workout is in no routine
// list, by design), and the generic label when the routine it names is gone.
export function workoutTitle(
  routineId: string,
  routineName: Map<string, string>,
  t: (key: string) => string,
) {
  if (routineId === FREE_ROUTINE_ID) {
    return t("routines.free");
  }
  return routineName.get(routineId) ?? t("activity.workout");
}

// A workout carries no end time; its last logged set is when it stopped.
export function workoutDurationMs(workout: Workout) {
  const last = workout.sets[workout.sets.length - 1];
  return last ? Math.max(0, last.ts - workout.started) : 0;
}
