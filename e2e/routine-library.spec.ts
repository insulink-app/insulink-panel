import { expect, test, type Page } from "@playwright/test";
import { fakeSportApi } from "./fake-sport-api";
import { signInAndOpen } from "./mock-api";
import { BENCH, LEG_DAY, LIBRARY, PLANK, PUSH_DAY, runningSnapshot } from "./sport-fixtures";

/** The editor's number fields per exercise row: sets, target, weight, rest. */
const FIELDS = { sets: 0, target: 1, weight: 2, rest: 3 };

function numberField(page: Page, row: number, field: keyof typeof FIELDS) {
  return page.getByRole("spinbutton").nth(row * 4 + FIELDS[field]);
}

async function pickExercise(page: Page, row: number, name: string) {
  await page.getByRole("combobox", { name: "Exercise" }).nth(row).click();
  await page.getByRole("option", { name }).click();
}

test("a new routine is saved with every value typed and shown on its page", async ({ page }) => {
  const { writes } = await fakeSportApi(page, { exercises: LIBRARY, routines: [LEG_DAY] });
  await signInAndOpen(page, "/health/routines");
  await page.getByRole("link", { name: "Add routine" }).click();

  const save = page.getByRole("button", { name: "Save" });
  await expect(save).toBeDisabled();
  await page.getByRole("textbox", { name: "Name" }).fill("Upper body");
  await page.getByRole("button", { name: "Add exercise" }).click();
  await page.getByRole("button", { name: "Add exercise" }).click();
  await pickExercise(page, 1, PLANK.name);
  await numberField(page, 0, "sets").fill("4");
  await numberField(page, 0, "target").fill("6");
  await numberField(page, 0, "weight").fill("62.5");
  await numberField(page, 0, "rest").fill("120");
  await numberField(page, 1, "target").fill("45");
  await numberField(page, 1, "rest").fill("0");
  await save.click();

  await expect(page).toHaveURL(/\/health\/routines\/(?!new)[^/]+$/);
  const [synced] = writes.routines;
  expect(synced).toHaveLength(2);
  expect(synced[0]).toEqual(LEG_DAY);
  expect(synced[1]).toMatchObject({ name: "Upper body" });
  expect(synced[1].items).toMatchObject([
    { ex: BENCH.id, sets: 4, target: 6, weight: 62.5, rest: 120 },
    { ex: PLANK.id, sets: 3, target: 45, weight: 0, rest: 0 },
  ]);

  await expect(page.getByRole("heading", { name: "Upper body" })).toBeVisible();
  await expect(page.getByText("4 × 6")).toBeVisible();
  await expect(page.getByText("62.5 kg")).toBeVisible();
  await expect(page.getByText("120s")).toBeVisible();
  await expect(page.getByText("3 × 45")).toBeVisible();
});

test("editing a routine replaces only that routine", async ({ page }) => {
  const { writes } = await fakeSportApi(page, {
    exercises: LIBRARY,
    routines: [PUSH_DAY, LEG_DAY],
  });
  await signInAndOpen(page, `/health/routines/${PUSH_DAY.id}/edit`);

  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue(PUSH_DAY.name);
  await numberField(page, 0, "sets").fill("5");
  await page.getByRole("button", { name: "Delete" }).nth(1).click();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(new RegExp(`/health/routines/${PUSH_DAY.id}$`));
  const synced = writes.routines[0];
  expect(synced).toContainEqual(LEG_DAY);
  expect(synced.find((entry) => entry.id === PUSH_DAY.id)).toEqual({
    ...PUSH_DAY,
    items: [{ ...PUSH_DAY.items[0], sets: 5 }],
  });
});

test("cancelling the editor sends nothing", async ({ page }) => {
  const { writes } = await fakeSportApi(page, { exercises: LIBRARY, routines: [PUSH_DAY] });
  await signInAndOpen(page, `/health/routines/${PUSH_DAY.id}/edit`);
  await page.getByRole("textbox", { name: "Name" }).fill("Renamed");
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page).toHaveURL(new RegExp(`/health/routines/${PUSH_DAY.id}$`));
  await expect(page.getByRole("heading", { name: PUSH_DAY.name })).toBeVisible();
  expect(writes.routines).toHaveLength(0);
});

test("the editor explains an empty exercise library", async ({ page }) => {
  await fakeSportApi(page);
  await signInAndOpen(page, "/health/routines/new");
  await expect(page.getByText("No exercises in your library yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add exercise" })).toBeDisabled();
});

test("deleting a routine asks first and keeps the others", async ({ page }) => {
  const { writes } = await fakeSportApi(page, {
    exercises: LIBRARY,
    routines: [PUSH_DAY, LEG_DAY],
  });
  await signInAndOpen(page, `/health/routines/${PUSH_DAY.id}`);

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(`"${PUSH_DAY.name}"`);
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL(/\/health\/routines$/);
  expect(writes.routines).toEqual([[LEG_DAY]]);
  await expect(page.getByText(PUSH_DAY.name, { exact: true })).toHaveCount(0);
  await expect(page.getByText(LEG_DAY.name)).toBeVisible();
});

test("a workout running on the phone surfaces on the list", async ({ page }) => {
  await fakeSportApi(page, {
    exercises: LIBRARY,
    routines: [PUSH_DAY],
    active: runningSnapshot(),
    updated: 1,
  });
  await signInAndOpen(page, "/health/routines");

  await expect(page.getByText("Workout in progress")).toBeVisible();
  await page.getByRole("link", { name: /Workout in progress/ }).click();
  await expect(page).toHaveURL(new RegExp(`/health/routines/${PUSH_DAY.id}/run$`));
});

test("a routine without exercises cannot be started", async ({ page }) => {
  const empty = { id: "empty", name: "Empty", items: [] };
  await fakeSportApi(page, { exercises: LIBRARY, routines: [empty] });
  await signInAndOpen(page, `/health/routines/${empty.id}`);
  await expect(page.getByRole("button", { name: "Start" })).toBeDisabled();
});
