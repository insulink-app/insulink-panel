import { expect, type Page, type Route } from "@playwright/test";

export const STALE_TOKEN = "stale-token";
export const FRESH_TOKEN = "fresh-token";

/**
 * Answers a data request for a bearer token. Return a status code to
 * fail the request; return nothing to let it succeed with an empty body.
 */
export type DataResponder = (bearerToken: string) => number | void;

/**
 * Mocks the whole `/v1/` API: sign-in hands out the stale token, refresh
 * hands out the fresh one, every other request goes to `respondToData`.
 * Records the paths that were hit so a test can assert on them.
 */
export async function mockApi(page: Page, respondToData: DataResponder) {
  const requestedPaths: string[] = [];
  await page.route("**/v1/**", async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    requestedPaths.push(path);
    if (path.endsWith("/signin/")) {
      return route.fulfill({ json: tokenResponse(STALE_TOKEN) });
    }
    if (path.endsWith("/refresh/")) {
      return route.fulfill({ json: tokenResponse(FRESH_TOKEN) });
    }
    const bearerToken = (route.request().headers()["authorization"] ?? "")
      .replace("Bearer ", "");
    const failureStatus = respondToData(bearerToken);
    if (failureStatus) {
      return route.fulfill({ status: failureStatus, json: {} });
    }
    return route.fulfill({ json: {} });
  });
  return requestedPaths;
}

/**
 * Fills in the login form and submits it. Waits for the page's own deferred
 * autofocus first: landing later, it would steal focus mid-fill and type the
 * password into the name field.
 */
export async function signIn(page: Page) {
  await page.goto("/login/");
  await expect(page.locator("#name")).toBeFocused();
  await page.locator("#name").fill("tester");
  await page.locator("#password").fill("secret");
  await page.locator("#login").click();
}

function tokenResponse(authenticationToken: string) {
  return {
    success: true,
    name: "Tester",
    authentication_token: authenticationToken,
    refresh_token: "refresh-token",
  };
}

/** Signs in, waits for the session to land, then opens `path`. */
export async function signInAndOpen(page: Page, path: string) {
  await signIn(page);
  await expect(page).toHaveURL(/\/overview\/$/);
  await page.goto(path);
}
