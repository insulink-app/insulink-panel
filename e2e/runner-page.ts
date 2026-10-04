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
  await tickUntilVisible(page, "Total:");
  return api;
}

/**
 * TanStack Query hands results over through `setTimeout(0)`, which a paused
 * clock never fires, so the page is ticked in 10 ms steps until it shows
 * `text`. The session therefore starts a few ms after START, never later.
 */
async function tickUntilVisible(page: Page, text: string) {
  const marker = page.getByText(text, { exact: true });
  for (let tick = 0; tick < 500; tick += 1) {
    if (await marker.isVisible()) {
      return;
    }
    await page.clock.runFor(10);
  }
  throw new Error(`"${text}" never appeared`);
}

/** Asserts a span of epoch ms is `seconds` long, to the whole second. */
export function expectSeconds(spanMs: number, seconds: number) {
  expect(Math.floor(spanMs / 1000)).toBe(seconds);
}

/** Opens the runner on a real clock, for tests that wait on the 2 s poll. */
export async function openLiveRunner(page: Page, routineId: string, seed: Partial<SportState>) {
  const api = await fakeSportApi(page, seed);
  await signInAndOpen(page, `/health/routines/${routineId}/run`);
  await expect(page.getByText("Total:", { exact: true })).toBeVisible();
  return api;
}

/** The "Exercise 1/2 · Set 1/3" line, whitespace-tolerant. */
export function position(page: Page, exercise: string, set: string) {
  return page.getByText(new RegExp(`Exercise ${exercise}\\s+·\\s+Set ${set}`));
}

/** The big session clock under "Total:". */
export function totalClock(page: Page) {
  return page.getByText("Total:").locator("xpath=following-sibling::span[1]");
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
