import { expect, test } from "@playwright/test";
import { FRESH_TOKEN, STALE_TOKEN, mockApi, signIn } from "./mock-api";

test("sign-in lands on the overview", async ({ page }) => {
  await mockApi(page, () => {});
  await signIn(page);
  await expect(page).toHaveURL(/\/overview\/$/);
});

test("wrong credentials stay on the login page with an error", async ({ page }) => {
  await page.route("**/v1/signin/", (route) =>
    route.fulfill({ json: { success: false, error: 1000 } }),
  );
  await signIn(page);
  await expect(page.locator("[data-sonner-toast]")).toBeVisible();
  await expect(page).toHaveURL(/\/login\/$/);
});

test("417 refreshes the token and retries the request", async ({ page }) => {
  const freshTokenRequests: string[] = [];
  const requestedPaths = await mockApi(page, (bearerToken) => {
    if (bearerToken === STALE_TOKEN) {
      return 417;
    }
    if (bearerToken === FRESH_TOKEN) {
      freshTokenRequests.push(bearerToken);
    }
  });
  await signIn(page);
  await expect.poll(() => freshTokenRequests.length).toBeGreaterThan(0);
  expect(requestedPaths.filter((path) => path.endsWith("/refresh/"))).toHaveLength(1);
  await expect(page).toHaveURL(/\/overview\/$/);
});

test("403 clears the session and returns to login", async ({ page }) => {
  await mockApi(page, () => 403);
  await signIn(page);
  await expect(page).toHaveURL(/\/login\/$/);
  await expect(page.locator("#login")).toBeVisible();
});
