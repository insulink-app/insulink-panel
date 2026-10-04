import type { Page, Request } from "@playwright/test";
import type {
  ActiveWorkout,
  Routine,
  SportExercise,
  Workout,
} from "../src/api/services/sport-service";
import { mockApi } from "./mock-api";

/** The account's sport data as the fake server holds it. */
export type SportState = {
  exercises: SportExercise[];
  routines: Routine[];
  workouts: Workout[];
  active?: ActiveWorkout;
  updated: number;
};

/** Every write the panel sent, in order, so a test can assert on the wire. */
export type SportWrites = {
  exercises: SportExercise[][];
  routines: Routine[][];
  workouts: Workout[][];
  active: ActiveWorkout[];
  clears: number;
};

/**
 * Signs in against the mocked API and serves `/v1/sport/` from an in-memory
 * account: a sync replaces the collection, so the next find returns it, the
 * way the real full-replace endpoints behave. `state` stays live, so a test
 * can play the phone by changing it between polls.
 */
export async function fakeSportApi(page: Page, seed: Partial<SportState> = {}) {
  const state: SportState = { exercises: [], routines: [], workouts: [], updated: 0, ...seed };
  const writes: SportWrites = { exercises: [], routines: [], workouts: [], active: [], clears: 0 };
  await mockApi(page, () => {});
  await page.route("**/v1/sport/**", (route) =>
    route.fulfill({ json: answer(route.request(), state, writes) }),
  );
  return { state, writes };
}

/** Replays one sport endpoint against the in-memory account. */
function answer(request: Request, state: SportState, writes: SportWrites) {
  const path = new URL(request.url()).pathname.replace(/^.*\/v1\/sport/, "");
  const body = request.postDataJSON();
  switch (path) {
    case "/exercises/find/":
      return { success: true, exercises: state.exercises };
    case "/routines/find/":
      return { success: true, routines: state.routines };
    case "/workouts/find/":
      return { success: true, workouts: state.workouts };
    case "/workout/active/find/":
      return { success: true, workout: state.active, updated: state.updated };
    case "/exercises/sync/":
      writes.exercises.push(body.exercises);
      state.exercises = body.exercises;
      return { success: true };
    case "/routines/sync/":
      writes.routines.push(body.routines);
      state.routines = body.routines;
      return { success: true };
    case "/workouts/sync/":
      writes.workouts.push(body.workouts);
      state.workouts = body.workouts;
      return { success: true };
    case "/workout/active/sync/":
      return syncActive(body, state, writes);
    case "/workout/active/clear/":
      writes.clears += 1;
      state.active = undefined;
      return { success: true };
    default:
      return { success: true };
  }
}

/**
 * Mirrors the account's fence: a push carrying a stamp for a workout that is
 * no longer there is refused, so a late push cannot revive a finished one.
 */
function syncActive(
  body: { workout: ActiveWorkout; updated: number },
  state: SportState,
  writes: SportWrites,
) {
  if (body.updated > 0 && !state.active) {
    return { success: false };
  }
  writes.active.push(body.workout);
  state.active = body.workout;
  state.updated += 1;
  return { success: true, updated: state.updated };
}
