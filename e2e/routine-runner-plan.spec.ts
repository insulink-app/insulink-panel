import { expect, test, type Page } from "@playwright/test";
import {
  advance,
  completeSet,
  currentCard,
  expectWorkoutPage,
  finishWorkout,
  openRunner,
  expectPosition,
  runningOrder,
} from "./runner-page";
import { BENCH, FULL_BODY, LIBRARY, PLANK, PUSHUP } from "./sport-fixtures";

const SEED = { exercises: LIBRARY, routines: [FULL_BODY] };

function step(page: Page, exerciseName: string) {
  return runningOrder(page).getByRole("listitem").filter({ hasText: exerciseName });
}

async function swapTo(page: Page, exerciseName: string) {
  await page.getByRole("button", { name: "Swap", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: exerciseName }).click();
}

test("the running order says in words what happened to each exercise", async ({ page }) => {
  await openRunner(page, FULL_BODY.id, SEED);
  await expect(currentCard(page)).toContainText(BENCH.name);
  await expect(currentCard(page)).toContainText("Now: set 1 of 2");
  await expect(currentCard(page)).toContainText("2 sets · 8 reps · 40 kg");
  await expect(step(page, PUSHUP.name)).toContainText("2 sets · 12 reps");
  await expect(step(page, PLANK.name)).toContainText("1 set · 30 s");

  await completeSet(page);
  await expect(currentCard(page)).toContainText("After the rest: set 2 of 2");

  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(step(page, BENCH.name)).toContainText("1 of 2 sets done");
  await expect(currentCard(page)).toContainText(PUSHUP.name);

  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(step(page, PUSHUP.name)).toContainText("2 sets · 12 reps");
  await expect(step(page, PUSHUP.name).locator("svg")).toHaveCount(0);
  await expect(currentCard(page)).toContainText(PLANK.name);
  await expect(page.getByRole("button", { name: "Skip", exact: true })).toHaveCount(0);
});

test("skipping during a rest drops the remaining sets of that exercise", async ({ page }) => {
  const { writes } = await openRunner(page, FULL_BODY.id, SEED);
  await completeSet(page);
  await expect(page.getByText("Rest", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expectPosition(page, "2/3", "1/2");
  await completeSet(page);
  await finishWorkout(page);

  await expectWorkoutPage(page);
  await expect.poll(() => writes.workouts.length).toBe(1);
  expect(writes.workouts[0][0].sets.map((set) => set.ex)).toEqual([BENCH.id, PUSHUP.id]);
});

test("a swap replaces the exercise for this session only", async ({ page }) => {
  const { writes } = await openRunner(page, FULL_BODY.id, SEED);
  await swapTo(page, PUSHUP.name);

  await expect(currentCard(page)).toContainText(PUSHUP.name);
  await expectPosition(page, "1/3", "1/2");
  await expect(page.getByRole("spinbutton")).toHaveValue("8");
  await advance(page, 1);
  await expect
    .poll(() => writes.active.at(-1)?.items?.map((item) => item.ex))
    .toEqual([PUSHUP.id, PUSHUP.id, PLANK.id]);
  expect(writes.active.at(-1)?.items?.[0].id).not.toBe(FULL_BODY.items[0].id);
  await completeSet(page);
  await finishWorkout(page);

  await expectWorkoutPage(page);
  await expect.poll(() => writes.workouts.length).toBe(1);
  expect(writes.workouts[0][0].sets).toMatchObject([{ ex: PUSHUP.id, reps: 8 }]);
  expect(writes.routines).toHaveLength(0);
});

test("a swap during the rest changes what comes next and keeps resting", async ({ page }) => {
  await openRunner(page, FULL_BODY.id, SEED);
  await completeSet(page);
  await swapTo(page, PLANK.name);

  await expect(page.getByText("Rest", { exact: true })).toBeVisible();
  await expect(currentCard(page)).toContainText(PLANK.name);
  await expect(currentCard(page)).toContainText("After the rest: set 1 of 2");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Target: 8 s")).toBeVisible();
});

test("a click on an exercise in the running order jumps there, back as well", async ({ page }) => {
  const { writes } = await openRunner(page, FULL_BODY.id, SEED);
  await step(page, PLANK.name).getByRole("button").click();
  await expect(currentCard(page)).toContainText(PLANK.name);
  await expectPosition(page, "3/3", "1/1");

  await step(page, BENCH.name).getByRole("button").click();
  await expect(currentCard(page)).toContainText(BENCH.name);
  await expectPosition(page, "1/3", "1/2");
  await completeSet(page);
  await finishWorkout(page);
  await expect.poll(() => writes.workouts.length).toBe(1);
  expect(writes.workouts[0][0].sets.map((set) => set.ex)).toEqual([BENCH.id]);
});

test("jumping back to an exercise already done prefills what was done there", async ({ page }) => {
  await openRunner(page, FULL_BODY.id, SEED);
  await page.getByRole("spinbutton").fill("6");
  await page.getByRole("button", { name: "Increase weight" }).click();
  await completeSet(page);
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByRole("spinbutton")).toHaveValue("12");

  await step(page, BENCH.name).getByRole("button").click();
  await expect(page.getByRole("spinbutton")).toHaveValue("6");
  await expect(page.getByText("42,5 kg")).toBeVisible();
});

test("only an exercise with every set logged gets the tick", async ({ page }) => {
  await openRunner(page, FULL_BODY.id, SEED);
  await completeSet(page);
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(step(page, BENCH.name)).toContainText("1 of 2 sets done");
  await expect(step(page, BENCH.name).locator("svg")).toHaveCount(0);

  await step(page, BENCH.name).getByRole("button").click();
  await completeSet(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await completeSet(page);
  await expect(step(page, BENCH.name)).toContainText("2 of 2 sets done");
  await expect(step(page, BENCH.name).locator("svg")).toHaveCount(1);
});
