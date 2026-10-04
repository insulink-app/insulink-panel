import type {
  ActiveWorkout,
  Routine,
  RoutineItem,
  SportExercise,
} from "../src/api/services/sport-service";

export const BENCH: SportExercise = { id: "bench", name: "Bench press", kind: "weighted" };
export const PUSHUP: SportExercise = { id: "pushup", name: "Push-up", kind: "reps" };
export const PLANK: SportExercise = { id: "plank", name: "Plank", kind: "timed" };
export const LIBRARY = [BENCH, PUSHUP, PLANK];

/** A routine slot with the editor's defaults, overridable per field. */
export function slot(id: string, ex: string, overrides: Partial<RoutineItem> = {}): RoutineItem {
  return { id, ex, sets: 3, target: 10, weight: 0, rest: 60, ...overrides };
}

/** Bench 2 × 8 @ 40 kg with 90 s rest, then a 1 × 30 s plank without rest. */
export const PUSH_DAY: Routine = {
  id: "push-day",
  name: "Push day",
  items: [
    slot("slot-bench", BENCH.id, { sets: 2, target: 8, weight: 40, rest: 90 }),
    slot("slot-plank", PLANK.id, { sets: 1, target: 30, rest: 0 }),
  ],
};

export const LEG_DAY: Routine = {
  id: "leg-day",
  name: "Leg day",
  items: [slot("slot-legs", PUSHUP.id)],
};

/** A snapshot of PUSH_DAY as the phone would push it, mid-workout. */
export function runningSnapshot(overrides: Partial<ActiveWorkout> = {}): ActiveWorkout {
  const started = Date.now() - 5 * 60_000;
  return {
    routine: PUSH_DAY.id,
    name: PUSH_DAY.name,
    items: PUSH_DAY.items,
    started,
    ex: 0,
    set: 1,
    phase: "exercising",
    setStarted: started + 3 * 60_000,
    restEnds: null,
    restStarted: null,
    paused: 0,
    pausedAt: null,
    reps: 8,
    weight: 40,
    sets: [{ ex: BENCH.id, reps: 8, kg: 40, dur: 45, rest: 90, ts: started + 60_000 }],
    ...overrides,
  };
}
