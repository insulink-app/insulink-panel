// npx tsx src/lib/insulin.check.ts
import assert from "node:assert/strict";
import { activeInsulin, basalSteps, basalUnits } from "./insulin";

const HOUR = 60 * 60 * 1000;
const start = new Date(2026, 9, 11, 9, 30).getTime();
const rates = Array.from({ length: 24 }, (_, hour) => (hour < 10 ? 1 : 2));
const steps = basalSteps(rates, start, start + 2 * HOUR);
assert.deepEqual(
  steps.map((step) => step.rate),
  [1, 2, 2],
);
assert.equal(basalUnits(steps, start + 2 * HOUR), 0.5 + 2 + 1);
assert.equal(activeInsulin([{ time: 0, units: 4 }], 4, 1 * HOUR), 3);
assert.equal(activeInsulin([{ time: 0, units: 4 }], 4, 5 * HOUR), 0);
console.log("pod delivery: ok");
