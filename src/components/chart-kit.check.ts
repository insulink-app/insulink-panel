// npx tsx src/components/chart-kit.check.ts
import assert from "node:assert/strict";
import { evenTicks } from "./chart-kit";

assert.deepEqual(evenTicks(0, 100, 5), [0, 25, 50, 75, 100]);
assert.deepEqual(evenTicks(10, 10), [10]);
console.log("chart-kit.check passed");
