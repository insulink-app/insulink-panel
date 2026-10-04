import { expect, test } from "@playwright/test";
import { fakeSportApi } from "./fake-sport-api";
import { signInAndOpen } from "./mock-api";
import { BENCH, LIBRARY, PLANK, PUSHUP } from "./sport-fixtures";

test("an empty library invites the first exercise", async ({ page }) => {
  await fakeSportApi(page);
  await signInAndOpen(page, "/health/routines/exercises");
  await expect(page.getByText("No exercises yet. Create your first one.")).toBeVisible();
});

test("creating an exercise syncs it with its kind", async ({ page }) => {
  const { writes } = await fakeSportApi(page, { exercises: [BENCH] });
  await signInAndOpen(page, "/health/routines/exercises");

  await page.getByRole("button", { name: "New exercise" }).click();
  const dialog = page.getByRole("dialog");
  const save = dialog.getByRole("button", { name: "Save" });
  await expect(save).toBeDisabled();
  await dialog.getByRole("textbox").fill("Dips");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Timed" }).click();
  await save.click();

  await expect(dialog).toBeHidden();
  expect(writes.exercises).toHaveLength(1);
  const [kept, created] = writes.exercises[0];
  expect(kept).toEqual(BENCH);
  expect(created).toMatchObject({ name: "Dips", kind: "timed" });
  await expect(page.getByText("Dips")).toBeVisible();
});

test("editing an exercise replaces it in place and keeps the rest", async ({ page }) => {
  const { writes } = await fakeSportApi(page, { exercises: LIBRARY });
  await signInAndOpen(page, "/health/routines/exercises");

  await page.getByRole("button", { name: "Edit" }).nth(1).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox")).toHaveValue(PUSHUP.name);
  await dialog.getByRole("textbox").fill("Diamond push-up");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog).toBeHidden();
  const synced = writes.exercises[0];
  expect(synced).toHaveLength(3);
  expect(synced).toContainEqual({ ...PUSHUP, name: "Diamond push-up" });
  expect(synced).toContainEqual(BENCH);
  expect(synced).toContainEqual(PLANK);
});

test("deleting asks first and sends the list without it", async ({ page }) => {
  const { writes } = await fakeSportApi(page, { exercises: LIBRARY });
  await signInAndOpen(page, "/health/routines/exercises");

  await page.getByRole("button", { name: "Delete" }).first().click();
  await expect(page.getByRole("alertdialog")).toContainText(`"${BENCH.name}"`);
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(writes.exercises).toHaveLength(0);

  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText(BENCH.name, { exact: true })).toHaveCount(0);
  expect(writes.exercises).toEqual([[PUSHUP, PLANK]]);
});
