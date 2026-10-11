import { expect, test, type Page } from "@playwright/test";
import type { SportState } from "./fake-sport-api";
import { completeSet, currentCard, openLiveRunner, expectPosition } from "./runner-page";
import { BENCH, LIBRARY, PLANK, PUSH_DAY, runningSnapshot } from "./sport-fixtures";

const SEED = { exercises: LIBRARY, routines: [PUSH_DAY] };
const POLL_TIMEOUT = { timeout: 10_000 };

/** Waits until the account holds this tab's workout and a poll has seen it. */
async function waitUntilMirrored(page: Page, state: SportState) {
  await expect.poll(() => state.active, POLL_TIMEOUT).toBeDefined();
  await page.waitForResponse("**/v1/sport/workout/active/find/");
}

/** Plays the phone: rewrites the account's snapshot with a newer stamp. */
function phoneWrites(state: SportState, patch: Partial<NonNullable<SportState["active"]>>) {
  state.active = { ...state.active!, ...patch };
  state.updated += 1;
}

test("the runner mirrors itself with the routine embedded", async ({ page }) => {
  const { writes } = await openLiveRunner(page, PUSH_DAY.id, SEED);

  await expect.poll(() => writes.active.length, POLL_TIMEOUT).toBeGreaterThan(0);
  expect(writes.active[0]).toMatchObject({
    routine: PUSH_DAY.id,
    name: PUSH_DAY.name,
    items: PUSH_DAY.items,
    ex: 0,
    set: 0,
    phase: "exercising",
    sets: [],
  });

  await completeSet(page);
  await expect.poll(() => writes.active.at(-1)?.phase, POLL_TIMEOUT).toBe("resting");
  expect(writes.active.at(-1)).toMatchObject({ ex: 0, set: 1, sets: [{ ex: BENCH.id, reps: 8 }] });
});

test("a workout from the phone resumes from the phone's copy of the routine", async ({ page }) => {
  const snapshot = runningSnapshot();
  const diverged = { ...PUSH_DAY, name: "Old push day", items: [...PUSH_DAY.items].reverse() };
  const { writes } = await openLiveRunner(page, PUSH_DAY.id, {
    ...SEED,
    routines: [diverged],
    active: snapshot,
    updated: 1,
  });

  await expectPosition(page, "1/2", "2/2");
  await expect(currentCard(page)).toContainText(BENCH.name);
  await expect(page.getByRole("link", { name: PUSH_DAY.name, exact: true })).toBeVisible();
  await expect.poll(() => writes.active.at(-1)?.started, POLL_TIMEOUT).toBe(snapshot.started);
  expect(writes.active.at(-1)?.sets).toEqual(snapshot.sets);
});

test("a legacy snapshot without items falls back to the local routine", async ({ page }) => {
  const legacy = runningSnapshot({ ex: 1, set: 0, items: undefined, name: undefined });
  await openLiveRunner(page, PUSH_DAY.id, { ...SEED, active: legacy, updated: 1 });
  await expectPosition(page, "2/2", "1/1");
  await expect(currentCard(page)).toContainText(PLANK.name);
});

test("a snapshot already in the logbook starts fresh instead of logging twice", async ({ page }) => {
  const snapshot = runningSnapshot();
  const logged = { id: "logged", routine: PUSH_DAY.id, started: snapshot.started, sets: snapshot.sets };
  const { writes } = await openLiveRunner(page, PUSH_DAY.id, {
    ...SEED,
    workouts: [logged],
    active: snapshot,
    updated: 1,
  });

  await expectPosition(page, "1/2", "1/2");
  await expect.poll(() => writes.active.length, POLL_TIMEOUT).toBeGreaterThan(0);
  expect(writes.active[0].started).not.toBe(snapshot.started);
  expect(writes.active[0].sets).toEqual([]);
});

test("a set logged on the phone shows up here", async ({ page }) => {
  const { state } = await openLiveRunner(page, PUSH_DAY.id, SEED);
  await waitUntilMirrored(page, state);

  const now = Date.now();
  phoneWrites(state, {
    set: 1,
    phase: "resting",
    restStarted: now,
    restEnds: now + 90_000,
    sets: [{ ex: BENCH.id, reps: 8, kg: 40, dur: 40, ts: now }],
  });

  await expect(page.getByText("Rest", { exact: true })).toBeVisible(POLL_TIMEOUT);
  await expect(currentCard(page)).toContainText("After the rest: set 2 of 2");
});

test("a pause on the phone freezes this screen too", async ({ page }) => {
  const { state } = await openLiveRunner(page, PUSH_DAY.id, SEED);
  await waitUntilMirrored(page, state);

  phoneWrites(state, { pausedAt: Date.now() });

  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible(POLL_TIMEOUT);
});

test("a workout finished on the phone closes the runner without logging it again", async ({ page }) => {
  const { state, writes } = await openLiveRunner(page, PUSH_DAY.id, SEED);
  await waitUntilMirrored(page, state);

  state.active = undefined;
  state.updated += 1;

  await expect(page.getByText("Workout was finished on another device.")).toBeVisible(POLL_TIMEOUT);
  await expect(page).toHaveURL(new RegExp(`/health/routines/${PUSH_DAY.id}$`));
  expect(writes.workouts).toHaveLength(0);
  expect(state.active).toBeUndefined();
});
