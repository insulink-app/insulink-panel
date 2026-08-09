// Self-check for the runner's session maths — run with
// `npx tsx src/pages/panel/routine-runner/core.check.ts`.
// Guards what a type error cannot: the runner shows a ticking clock ("m:ss"),
// while the activity pages spell durations out ("5m 30s") — the two formatters
// are interchangeable to the compiler and a swap would only show up on screen.
// Also pins the resume clamping, which reads an undefined item when it slips.
import assert from "node:assert/strict";
import type { ActiveWorkout, Routine } from "@/api/services/sport-service";
import { FREE_ROUTINE_ID } from "@/lib/workout";
import {
  awaitsNextExercise,
  clampReps,
  coreFrom,
  describeSet,
  formatClock,
  remainingSeconds,
  routineHome,
  shouldAdopt,
  snapshotOf,
  type Core,
} from "./core";

// A ticking clock, never a spelled-out duration.
assert.equal(formatClock(0), "0:00");
assert.equal(formatClock(65), "1:05");
assert.equal(formatClock(3600), "1:00:00");
assert.equal(formatClock(3725), "1:02:05");

// The unit must come from i18next, not a literal — a German user reads "kg" via
// the same key, and hard-coding it silently bypasses the locale files.
const translate = (key: string) => (key === "body.kg" ? "KG-FROM-LOCALE" : key);
assert.equal(describeSet({ ex: "a", reps: 12, kg: 20, ts: 0 }, translate), "12 × 20 KG-FROM-LOCALE");
assert.equal(describeSet({ ex: "a", reps: 12, ts: 0 }, translate), "12");
assert.equal(describeSet({ ex: "a", secs: 90, ts: 0 }, translate), "1:30");

// Reps reach the app as ints; a fractional value makes its parse throw on the phone.
assert.equal(clampReps(12.5), 13);
assert.equal(clampReps(-4), 0);
assert.equal(clampReps(10_000), 999);

const routine: Routine = {
  id: "r1",
  name: "Test",
  items: [{ id: "i1", ex: "e1", sets: 3, target: 10, weight: 40, rest: 60 }],
};

const fresh = coreFrom(undefined, routine);
assert.equal(fresh.phase, "exercising");
assert.equal(fresh.currentReps, 10);
assert.equal(fresh.currentWeight, 40);
assert.equal(fresh.sets.length, 0);

// A snapshot whose routine was shortened since it started must clamp back into
// range rather than point past the end of the items.
const stale: ActiveWorkout = {
  routine: "r1",
  started: 1000,
  ex: 9,
  set: 9,
  phase: "resting",
  setStarted: 2000,
  restEnds: 3000,
  restStarted: 2500,
  paused: 5000,
  reps: 8,
  weight: 35,
  sets: [],
};
const resumed = coreFrom(stale, routine);
assert.equal(resumed.exerciseIndex, 0);
assert.equal(resumed.setIndex, 2);
assert.ok(routine.items[resumed.exerciseIndex] !== undefined);
// A workout paused on the phone resumes running here.
assert.equal(resumed.pausedAt, null);
assert.equal(resumed.pausedTotal, 5000);

// A finished workout is cleared, so a snapshot never resumes as "done".
assert.equal(coreFrom({ ...stale, phase: "done" }, routine).phase, "exercising");

// Round trip: what we push back must describe the state we resumed, and must
// carry our copy of the routine so a follower resolves the exercise/set/target
// by the driver's items, not by indexing its own.
const snapshot = snapshotOf(resumed, routine);
assert.equal(snapshot.started, stale.started);
assert.equal(snapshot.ex, resumed.exerciseIndex);
assert.equal(snapshot.set, resumed.setIndex);
assert.equal(snapshot.name, routine.name);
assert.deepEqual(snapshot.items, routine.items);
assert.deepEqual(coreFrom(snapshot, routine).sets, resumed.sets);

// A pause travels with the snapshot in both directions: without it this screen
// keeps counting while the phone sits paused, and adopting a snapshot silently
// un-pauses the workout.
const pausedRemote: ActiveWorkout = { ...snapshotOf(coreFrom(undefined, routine), routine), pausedAt: 5000 };
assert.equal(coreFrom(pausedRemote, routine).pausedAt, 5000);
assert.equal(snapshotOf({ ...coreFrom(undefined, routine), pausedAt: 5000 }, routine).pausedAt, 5000);
assert.equal(coreFrom({ ...pausedRemote, pausedAt: null }, routine).pausedAt, null);

// The adoption gate: what the other screen changed must arrive, what we pushed
// ourselves must not restart the session, and an older answer must be ignored.
const running = snapshotOf(coreFrom(undefined, routine), routine);
const ownPayload = JSON.stringify(running);
assert.equal(shouldAdopt(running, routine, ownPayload, 501, 500), false);
assert.equal(shouldAdopt({ ...running, pausedAt: 5000 }, routine, ownPayload, 501, 500), true);
assert.equal(shouldAdopt({ ...running, pausedAt: 5000 }, routine, ownPayload, 500, 500), false);
assert.equal(shouldAdopt({ ...running, set: 1 }, routine, ownPayload, 501, 500), true);

// A free workout is seeded before it has a single exercise — every read of an
// item has to survive that, or opening one throws on an undefined item instead
// of offering the picker.
const emptyFree: Routine = { id: FREE_ROUTINE_ID, name: "Free", items: [] };
const freshFree = coreFrom(undefined, emptyFree);
assert.equal(freshFree.currentReps, 0);
assert.equal(freshFree.exerciseIndex, 0);
const resumedFree = coreFrom(snapshotOf(freshFree, emptyFree), emptyFree);
assert.equal(resumedFree.exerciseIndex, 0);
assert.equal(resumedFree.setIndex, 0);

// Leaving a free workout lands on the routine list: it has no routine page.
assert.equal(routineHome(FREE_ROUTINE_ID), "/health/routines");
assert.equal(routineHome("r1"), "/health/routines/r1");

// The predicted end extrapolates the session's own pace. Its edges are what can
// go wrong quietly: nothing logged yet (the plan stands in), nothing left to do,
// and a free workout, which has no plan to predict against at all.
const reps = (id: string) => ({ id, name: id, kind: "reps" as const });
const paced: Core = {
  ...coreFrom(undefined, routine),
  startedAt: 0,
  sets: [
    { ex: "e1", reps: 10, ts: 0 },
    { ex: "e1", reps: 10, ts: 0 },
  ],
};
// Three sets planned, two done in 4 min → one left at 2 min a set.
assert.equal(remainingSeconds(paced, routine, reps, 240_000), 120);
assert.equal(remainingSeconds({ ...paced, pausedTotal: 60_000 }, routine, reps, 240_000), 90);
assert.equal(remainingSeconds(coreFrom(undefined, routine), routine, reps, 0), 3 * (60 + 60));
assert.equal(remainingSeconds({ ...paced, phase: "done" }, routine, reps, 240_000), null);
assert.equal(remainingSeconds(paced, emptyFree, reps, 240_000), null);

// A free workout is one set per exercise: once its set is logged it is resting
// with nothing queued, and the runner must ask what comes next instead of
// offering to carry on with an exercise that is done.
const freeItem = { id: "f1", ex: "e1", sets: 1, target: 10, weight: 0, rest: 120 };
const oneExercise: Routine = { id: FREE_ROUTINE_ID, name: "Free", items: [freeItem] };
const restingFree: Core = { ...coreFrom(undefined, oneExercise), phase: "resting" };
assert.equal(awaitsNextExercise(restingFree, oneExercise), false);
assert.equal(
  awaitsNextExercise({ ...restingFree, sets: [{ ex: "e1", reps: 10, ts: 0 }] }, oneExercise),
  true,
);
// Not while the set is being performed, and never for a real routine — that one
// has a plan to carry on with.
assert.equal(
  awaitsNextExercise(
    { ...restingFree, phase: "exercising", sets: [{ ex: "e1", reps: 10, ts: 0 }] },
    oneExercise,
  ),
  false,
);
assert.equal(awaitsNextExercise({ ...restingFree, sets: paced.sets }, routine), false);

console.log("routine-runner core: ok");
