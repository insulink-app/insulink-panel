import type { Measurement, Routine, SportExercise, Training, Workout } from "@/api/services/sport-service";
import { between, DAY_MS, DEMO_DAYS, HOUR_MS, midnight, MINUTE_MS, NOW } from "./random";

export const DEMO_EXERCISES: SportExercise[] = [
  { id: "bench", name: "Bench press", kind: "weighted" },
  { id: "squat", name: "Squat", kind: "weighted" },
  { id: "pushup", name: "Push-up", kind: "reps" },
  { id: "plank", name: "Plank", kind: "timed" },
];

export const DEMO_ROUTINES: Routine[] = [
  {
    id: "full-body", name: "Full body", items: [
      { id: "fb-squat", ex: "squat", sets: 3, target: 8, weight: 60, rest: 90 },
      { id: "fb-bench", ex: "bench", sets: 3, target: 8, weight: 50, rest: 90 },
      { id: "fb-plank", ex: "plank", sets: 2, target: 45, weight: 0, rest: 60 },
    ],
  },
  { id: "quick", name: "Quick push", items: [{ id: "q-pushup", ex: "pushup", sets: 3, target: 15, weight: 0, rest: 45 }] },
];

/** The full-body routine done every three or four days, slowly getting heavier. */
export function demoWorkouts(): Workout[] {
  const sessions = Math.floor((DEMO_DAYS - 2) / 3.5);
  return Array.from({ length: sessions }, (_, session) => {
    const started = midnight(Math.round(2 + (sessions - 1 - session) * 3.5)) + 18 * HOUR_MS;
    let cursor = started;
    const sets = DEMO_ROUTINES[0].items.flatMap((item) =>
      Array.from({ length: item.sets }, () => {
        cursor += 2 * MINUTE_MS;
        const timed = item.ex === "plank";
        return {
          ex: item.ex, reps: timed ? undefined : item.target, secs: timed ? item.target : undefined,
          kg: timed ? undefined : item.weight + Math.floor(session / 2) * 1.25, dur: Math.round(between(30, 55)), rest: item.rest, ts: cursor,
        };
      }),
    );
    return { id: `workout-${session}`, routine: "full-body", started, sets };
  });
}

/** A short line of track points heading north-east from a fixed start. */
function track(start: number, end: number) {
  const points = [];
  for (let step = 0; step <= 30; step += 1) {
    points.push({ lat: 50.9375 + step * 0.0006, lng: 6.9603 + step * 0.0008 + Math.sin(step / 4) * 0.0004, t: start + ((end - start) * step) / 30 });
  }
  return points;
}

/** An evening walk or jog every other day. */
export function demoTrainings(): Training[] {
  return Array.from({ length: DEMO_DAYS / 2 }, (_, index) => {
    const start = midnight(index * 2 + 1) + 19 * HOUR_MS;
    const jog = index % 2 === 0;
    const end = start + (jog ? 32 : 45) * MINUTE_MS;
    return { id: `training-${index}`, type: jog ? "jog" : "walk", start, end, dist: jog ? 5200 : 3600, auto: !jog, track: track(start, end) };
  });
}

/** Daily weight, steps, distance and calories. */
export function demoMeasurements(): Measurement[] {
  const entries: Measurement[] = [];
  for (let daysAgo = DEMO_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const time = daysAgo === 0 ? NOW : midnight(daysAgo) + DAY_MS - MINUTE_MS;
    const steps = Math.round(between(6000, 13000));
    entries.push(
      { type: "WEIGHT", value: Math.round((80 - (DEMO_DAYS - daysAgo) * 0.04 + between(-0.3, 0.3)) * 10) / 10, time: midnight(daysAgo) + 7 * HOUR_MS },
      { type: "STEPS", value: steps, time },
      { type: "DISTANCE", value: Math.round(steps * 0.075) / 100, time },
      { type: "CALORIES", value: Math.round(steps * 0.045), time },
    );
  }
  return entries;
}
