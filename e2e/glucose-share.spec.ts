import { expect, test, type Route } from "@playwright/test";
import { signInAndOpen } from "./mock-api";

const SHARE_ID = "5f1c8a52-3c1e-4a8e-9d55-0d1a6f3b2c11";

test("a share link shows the glucose without signing in, and installs as a PWA", async ({ page }) => {
  const now = Date.now();
  const requests: { path: string; auth?: string }[] = [];
  await page.route("**/v1/**", (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    requests.push({ path, auth: route.request().headers()["authorization"] });
    const entries = [
      { value: 110, time: now - 10 * 60_000 },
      { value: 123, time: now - 5 * 60_000 },
    ];
    return route.fulfill({ json: path.endsWith(`/share/${SHARE_ID}/`) ? { success: true, name: "Mum", owner: "Lukas", entries } : { success: false } });
  });

  await page.goto(`/share/${SHARE_ID}`);

  await expect(page.getByText("123", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hello Mum" })).toBeVisible();
  await expect(page.getByText("Lukas's glucose")).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /share\.webmanifest$/);
  expect(requests.every((request) => request.auth === undefined)).toBe(true);
  expect(requests.map((request) => request.path)).not.toContain("/v1/glucose/history/");
});

test("an unknown share link says it is gone", async ({ page }) => {
  await page.route("**/v1/**", (route: Route) => route.fulfill({ json: { success: false } }));

  await page.goto("/share/nope");

  await expect(page.getByText("This link does not exist or was deleted.")).toBeVisible();
});

test("links are created, listed and deleted in the settings", async ({ page }) => {
  let shares = [{ id: SHARE_ID, name: "Mum", created_at: Date.now() }];
  const writes: { path: string; body: unknown }[] = [];
  await page.route("**/v1/**", (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/signin/")) {
      return route.fulfill({ json: { success: true, name: "Tester", authentication_token: "token", refresh_token: "refresh" } });
    }
    if (path.endsWith("/glucose/share/find/")) {
      return route.fulfill({ json: { success: true, shares } });
    }
    if (request.method() === "POST" && path.includes("/glucose/share/")) {
      writes.push({ path, body: request.postDataJSON() });
      if (path.endsWith("/delete/")) {
        shares = [];
      }
    }
    return route.fulfill({ json: { success: true } });
  });

  await signInAndOpen(page, "/settings/share");
  await expect(page.getByText("Mum", { exact: true })).toBeVisible();

  await page.getByLabel("Who is it for").fill("Dad");
  await page.getByRole("button", { name: "Create link" }).click();
  await expect.poll(() => writes[0]).toEqual({ path: "/v1/glucose/share/create/", body: { name: "Dad" } });

  await page.getByRole("button", { name: "Delete link" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /delete/i }).click();
  await expect.poll(() => writes[1]).toEqual({ path: "/v1/glucose/share/delete/", body: { share_id: SHARE_ID } });
  await expect(page.getByText("No links yet.")).toBeVisible();
});
