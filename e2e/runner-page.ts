import { expect, type Page } from "@playwright/test";
import { fakeSportApi, type SportState } from "./fake-sport-api";
import { signIn, signInAndOpen } from "./mock-api";

/** A fixed wall clock, so durations and rests come out exact. */
export const START = new Date("2026-10-04T10:00:00");

/**
 * Serves `seed`, signs in, then stops time at START and opens the runner for
 * `routineId`. From here on time only moves through `advance`, which also
 * fires the debounced mirror and the polls.
 */
export async function openRunner(page: Page, routineId: string, seed: Partial<SportState>) {
  await page.clock.install({ time: START.getTime() - 60_000 });
  const api = await fakeSportApi(page, seed);
  await signIn(page);
  await expect(page).toHaveURL(/\/overview\/$/);
  await page.clock.pauseAt(START);
  await page.goto(`/health/routines/${routineId}/run`);
  await tickUntilVisible(page);
  return api;
}

/**
 * TanStack Query hands results over through `setTimeout(0)`, which a paused
 * clock never fires, so the page is ticked in 10 ms steps until the session
 * clock shows. The session therefore starts a few ms after START, never later.
 */
async function tickUntilVisible(page: Page) {
  const marker = totalClock(page);
  for (let tick = 0; tick < 500; tick += 1) {
    if (await marker.isVisible()) {
      return;
    }
    await page.clock.runFor(10);
  }
  throw new Error("the session clock never appeared");
}

/** Asserts a span of epoch ms is `seconds` long, to the whole second. */
export function expectSeconds(spanMs: number, seconds: number) {
  expect(Math.floor(spanMs / 1000)).toBe(seconds);
}

/** Opens the runner on a real clock, for tests that wait on the 2 s poll. */
export async function openLiveRunner(page: Page, routineId: string, seed: Partial<SportState>) {
  const api = await fakeSportApi(page, seed);
  await signInAndOpen(page, `/health/routines/${routineId}/run`);
  await expect(totalClock(page)).toBeVisible();
  return api;
}

/** Where the workout stands: "1/2" exercises in the header, "1/3" sets on the current card. */
export async function expectPosition(page: Page, exercise: string, set: string) {
  const [exerciseNumber, exercises] = exercise.split("/");
  const [setNumber, sets] = set.split("/");
  await expect(page.getByText(`${exerciseNumber} / ${exercises} exercises`)).toBeVisible();
  await expect(currentCard(page)).toContainText(`set ${setNumber} of ${sets}`);
}

/** The running order at the right edge. */
export function runningOrder(page: Page) {
  return page.getByRole("complementary", { name: "Your workout" });
}

/** The exercise on now in the running order. */
export function currentCard(page: Page) {
  return runningOrder(page).locator('li[aria-current="step"]');
}

/** The session clock at the start of the timeline. */
export function totalClock(page: Page) {
  return page.getByRole("timer", { name: "Total" });
}

export async function advance(page: Page, seconds: number) {
  await page.clock.fastForward(seconds * 1000);
}

export async function completeSet(page: Page) {
  await page.getByRole("button", { name: "Set done" }).click();
}

/** Confirms the finish dialog the way a user would. */
export async function finishWorkout(page: Page) {
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Finish" }).click();
}

export async function expectWorkoutPage(page: Page) {
  await expect(page).toHaveURL(/\/health\/activity\/workout\/[a-z0-9]+$/);
}
