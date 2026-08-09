// Self-check for the summary's headline figure — run with
// `npx tsx src/pages/panel/activity-detail/workout-summary.check.ts`.
// The percentage is computed per exercise and then averaged; comparing the two
// workouts' summed effort instead is a one-line slip the compiler cannot see,
// and it silently lets a high-rep exercise decide the whole number.
import assert from "node:assert/strict";
import type { Workout } from "@/api/services/sport-service";
import { effortRatioVsPrevious } from "./workout-summary";

const reps = (ex: string, count: number) => ({ ex, reps: count, ts: 0 });
const workoutOf = (sets: { ex: string; reps: number; ts: number }[]): Workout => ({
  id: "w",
  routine: "r",
  started: 0,
  sets,
});

// situps 0.9, bench 2.0 → 1.45. By summed effort it would be 100/105.
assert.equal(
  effortRatioVsPrevious(
    workoutOf([reps("situps", 90), reps("bench", 10)]),
    workoutOf([reps("situps", 100), reps("bench", 5)]),
  ),
  1.45,
);

// An exercise only one of the two has is left out: a new one has nothing to
// compare against, a dropped one would read as -100 %.
assert.equal(
  effortRatioVsPrevious(
    workoutOf([reps("bench", 12), reps("new", 40)]),
    workoutOf([reps("bench", 10), reps("dropped", 50)]),
  ),
  1.2,
);

// Sharing no exercise at all says nothing.
assert.equal(
  effortRatioVsPrevious(workoutOf([reps("squat", 10)]), workoutOf([reps("bench", 10)])),
  null,
);

console.log("workout summary: ok");
