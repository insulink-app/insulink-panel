import { expect, test } from "@playwright/test";
import {
  START,
  advance,
  completeSet,
  currentCard,
  expectSeconds,
  expectWorkoutPage,
  finishWorkout,
  openRunner,
  position,
  totalClock,
} from "./runner-page";
import { BENCH, LIBRARY, PLANK, PUSHUP, PUSH_DAY } from "./sport-fixtures";

const SEED = { exercises: LIBRARY, routines: [PUSH_DAY] };

test("a full routine logs every set with reps, weight, time and rest", async ({ page }) => {
  const { writes, state } = await openRunner(page, PUSH_DAY.id, SEED);

  await expect(position(page, "1/2", "1/2")).toBeVisible();
  await expect(currentCard(page)).toContainText(BENCH.name);
  const reps = page.getByRole("spinbutton");
  await expect(reps).toHaveValue("8");
  await expect(page.getByText("40,0 kg")).toBeVisible();
  await page.getByRole("button", { name: "Increase weight" }).click();
  await expect(page.getByText("42,5 kg")).toBeVisible();
  await reps.fill("7");
  await advance(page, 45);
  await completeSet(page);

  await expect(page.getByText("Rest", { exact: true })).toBeVisible();
  await expect(page.getByText("1:30", { exact: true })).toBeVisible();
  const previous = page.getByRole("spinbutton");
  await expect(previous).toHaveValue("7");
  await previous.fill("6");
  await advance(page, 30);
  await expect(page.getByText("1:00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(position(page, "1/2", "2/2")).toBeVisible();
  await expect(page.getByRole("spinbutton")).toHaveValue("8");
  await expect(page.getByText("40,0 kg")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Next: Plank/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Target: 30 s")).toBeVisible();
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  await advance(page, 32);
  await completeSet(page);

  await expectWorkoutPage(page);
  await expect.poll(() => writes.workouts.length).toBe(1);
  const [session] = writes.workouts[0];
  expect(session.routine).toBe(PUSH_DAY.id);
  expectSeconds(session.started - START.getTime(), 0);
  expect(session.id).toBe(session.started.toString(36));
  expect(session.sets).toHaveLength(3);
  expect(session.sets[0]).toMatchObject({ ex: BENCH.id, reps: 6, kg: 42.5, dur: 45, rest: 30 });
  expect(session.sets[1]).toMatchObject({ ex: BENCH.id, reps: 8, kg: 40 });
  expect(session.sets[2]).toMatchObject({ ex: PLANK.id, secs: 32, dur: 32 });
  expect(session.sets[2].reps).toBeUndefined();
  await expect.poll(() => writes.clears).toBeGreaterThan(0);
  expect(state.active).toBeUndefined();
});

test("an overrun rest counts up and +60 sec restarts from now", async ({ page }) => {
  await openRunner(page, PUSH_DAY.id, SEED);
  await completeSet(page);
  await advance(page, 100);
  await expect(page.getByText("+0:10", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+60 sec" }).click();
  await expect(page.getByText("1:00", { exact: true })).toBeVisible();
});

test("pausing freezes the clocks and resuming carries on", async ({ page }) => {
  const { writes } = await openRunner(page, PUSH_DAY.id, SEED);
  await advance(page, 10);
  await expect(totalClock(page)).toHaveText("0:10");

  await page.getByRole("button", { name: "Pause" }).click();
  await advance(page, 60);
  await expect(totalClock(page)).toHaveText("0:10");
  await expect.poll(() => writes.active.at(-1)?.pausedAt).toBeTruthy();
  expectSeconds(writes.active.at(-1)!.pausedAt! - START.getTime(), 10);

  await page.getByRole("button", { name: "Resume" }).click();
  await advance(page, 5);
  await expect(totalClock(page)).toHaveText("0:15");
  await expect.poll(() => writes.active.at(-1)?.paused).toBe(60_000);
});

test("finishing early asks first and saves only what was done", async ({ page }) => {
  const { writes } = await openRunner(page, PUSH_DAY.id, SEED);
  await completeSet(page);

  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Rest", { exact: true })).toBeVisible();
  expect(writes.workouts).toHaveLength(0);

  await finishWorkout(page);
  await expectWorkoutPage(page);
  await expect.poll(() => writes.workouts.length).toBe(1);
  expect(writes.workouts[0][0].sets).toHaveLength(1);
});

test("the header jumps to any exercise", async ({ page }) => {
  await openRunner(page, PUSH_DAY.id, SEED);
  await position(page, "1/2", "1/2").click();
  await page.getByRole("button", { name: `2. ${PLANK.name}` }).click();
  await expect(position(page, "2/2", "1/1")).toBeVisible();
  await expect(page.getByText("Target: 30 s")).toBeVisible();
});

test("an exercise added mid-workout joins the session, not the routine", async ({ page }) => {
  const { writes } = await openRunner(page, PUSH_DAY.id, SEED);
  await position(page, "1/2", "1/2").click();
  await page.getByRole("button", { name: "Add exercise" }).click();
  await page.getByRole("dialog").getByRole("button", { name: PUSHUP.name }).click();

  await expect(position(page, "1/3", "1/2")).toBeVisible();
  await advance(page, 1);
  await expect.poll(() => writes.active.at(-1)?.items?.length).toBe(3);
  expect(writes.active.at(-1)?.items?.[2]).toMatchObject({ ex: PUSHUP.id, sets: 3, rest: 60 });
  expect(writes.routines).toHaveLength(0);
});

test("the comparison reads this routine's last run, already during the rest", async ({ page }) => {
  const sameRoutine = {
    id: "past",
    routine: PUSH_DAY.id,
    started: START.getTime() - 2 * 86_400_000,
    sets: [
      { ex: BENCH.id, reps: 6, kg: 35, ts: 0 },
      { ex: BENCH.id, reps: 5, kg: 37.5, ts: 0 },
    ],
  };
  const otherRoutine = {
    id: "other",
    routine: "leg-day",
    started: START.getTime() - 86_400_000,
    sets: [{ ex: BENCH.id, reps: 20, kg: 20, ts: 0 }],
  };
  await openRunner(page, PUSH_DAY.id, { ...SEED, workouts: [sameRoutine, otherRoutine] });
  await expect(page.getByText("Last time: 6 × 35 kg")).toBeVisible();
  await completeSet(page);
  await expect(page.getByText("Rest", { exact: true })).toBeVisible();
  await expect(page.getByText("Last time: 5 × 37,5 kg")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Last time: 5 × 37,5 kg")).toBeVisible();
});
