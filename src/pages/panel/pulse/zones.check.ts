// npx tsx src/pages/panel/pulse/zones.check.ts
import assert from "node:assert/strict";
import { zoneOf } from "./zones";

assert.equal(zoneOf(55), "rest");
assert.equal(zoneOf(60), "normal");
assert.equal(zoneOf(100), "elevated");
assert.equal(zoneOf(140), "high");
console.log("pulse zones: ok");
