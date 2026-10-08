// npx tsx src/layouts/panel/sidebar/navigation/active-url.check.ts
import assert from "node:assert/strict";
import { activeUrl } from "./active-url";

const urls = ["/overview", "/health/routines", "/health/routines/exercises", "/devices/sensor"];
assert.equal(activeUrl("/overview/", urls), "/overview");
assert.equal(activeUrl("/health/routines/abc/run", urls), "/health/routines");
assert.equal(activeUrl("/health/routines/exercises", urls), "/health/routines/exercises");
assert.equal(activeUrl("/devices/sensor/s1", urls), "/devices/sensor");
assert.equal(activeUrl("/settings/glucose", urls), undefined);
assert.equal(activeUrl("/overviewx", urls), undefined);
console.log("active-url.check passed");
