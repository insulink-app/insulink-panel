import { expect, test } from "@playwright/test";
import { fakeSportApi } from "./fake-sport-api";
import { signInAndOpen } from "./mock-api";
import {
  advance,
  completeSet,
  expectWorkoutPage,
  finishWorkout,
  openRunner,
  expectPosition,
} from "./runner-page";
import { LIBRARY, PLANK, PUSHUP, PUSH_DAY, runningSnapshot } from "./sport-fixtures";

const FREE = "free";

test("a free workout is picked exercise by exercise and logged as free", async ({ page }) => {
  const { writes } = await openRunner(page, FREE, { exercises: LIBRARY, routines: [PUSH_DAY] });

  await expect(page.getByText("No exercise picked yet.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Add exercise" }).click();
  await page.getByRole("dialog").getByRole("button", { name: PUSHUP.name }).click();

  await expectPosition(page, "1/1", "1/1");
  await expect(page.getByRole("spinbutton")).toHaveValue("10");
  await completeSet(page);

  await expect(page.getByText("2:00", { exact: true })).toBeVisible();
  await expect(page.getByText("What comes next?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  await advance(page, 15);
  await page.getByRole("button", { name: "Next exercise" }).click();
  await page.getByRole("dialog").getByRole("button", { name: PLANK.name }).click();

  await expectPosition(page, "2/2", "1/1");
  await expect(page.getByText("Target: 10 s")).toBeVisible();
  await advance(page, 20);
  await completeSet(page);
  await expect(page.getByText("What comes next?")).toBeVisible();

  await finishWorkout(page);
  await expectWorkoutPage(page);
  await expect.poll(() => writes.workouts.length).toBe(1);
  const [session] = writes.workouts[0];
  expect(session.routine).toBe(FREE);
  expect(session.sets).toMatchObject([
    { ex: PUSHUP.id, reps: 10, rest: 15 },
    { ex: PLANK.id, secs: 20 },
  ]);
  expect(writes.routines).toHaveLength(0);
});

test("a free workout running on the phone is named on the list", async ({ page }) => {
  const free = runningSnapshot({ routine: FREE, name: undefined, items: [] });
  await fakeSportApi(page, { exercises: LIBRARY, routines: [PUSH_DAY], active: free, updated: 1 });
  await signInAndOpen(page, "/health/routines");

  const card = page.getByRole("link", { name: /Workout in progress/ });
  await expect(card).toContainText("Free workout");
  await card.click();
  await expect(page).toHaveURL(/\/health\/routines\/free\/run$/);
});
