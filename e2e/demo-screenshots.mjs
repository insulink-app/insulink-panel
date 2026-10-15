// Photographs the demo's overview in both languages and themes, the way the
// app's screenshots job does (docs/SCREENSHOTS.md). Run against a served demo
// build: `node e2e/demo-screenshots.mjs <base url> <output dir>`.
import { chromium } from "@playwright/test";

const [baseUrl, outputDir] = process.argv.slice(2);
const LANGUAGES = { de: "de_DE", en: "en_US" };
const THEMES = ["dark", "light"];

const browser = await chromium.launch();
for (const [language, locale] of Object.entries(LANGUAGES)) {
  for (const theme of THEMES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const failures = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.addInitScript(([storedLocale, storedTheme]) => {
      localStorage.setItem("i18nextLng", storedLocale);
      localStorage.setItem("theme", storedTheme);
    }, [locale, theme]);
    await page.goto(`${baseUrl}overview/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    if (failures.length > 0) {
      throw new Error(`${language}-${theme}: ${failures.join("; ")}`);
    }
    await page.screenshot({ path: `${outputDir}/${language}-${theme}/overview.png` });
    await page.close();
  }
}
await browser.close();
