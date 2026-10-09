// npx tsx src/pages/panel/sleep/sleep.check.ts
import assert from "node:assert/strict";
import { formatHoursMinutes, laneOf, phaseMinutes } from "./sleep";

assert.equal(formatHoursMinutes(479, "h"), "7 h 59");
assert.equal(formatHoursMinutes(58, "h"), "58");
assert.equal(formatHoursMinutes(undefined, "h"), "–");
assert.equal(laneOf({ s: 4, a: 0, b: 1 }), "awake");
assert.equal(laneOf({ s: 0, a: 0, b: 1 }), "deep");
assert.equal(phaseMinutes({ d: "x", stages: { deep: 1, rem: 2, light: 3, awake: 4, restless: 5 } }).awake, 9);
console.log("sleep: ok");
