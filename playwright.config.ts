import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests for the auth flows. The API is mocked per test with
 * `page.route`, so no backend is needed; only the Vite dev server runs.
 */
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:5173",
    locale: "en-US",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
