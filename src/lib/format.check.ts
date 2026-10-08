// npx tsx src/lib/format.check.ts
import assert from "node:assert/strict";
import { formatNumber } from "./format";

assert.equal(formatNumber(86.5, 1), "86,5");
assert.equal(formatNumber(2654), "2.654");
assert.equal(formatNumber(4.512, 2), "4,51");
assert.equal(formatNumber(0, 1), "0,0");
assert.equal(formatNumber(-1.25, 1), "-1,3");
console.log("format.check passed");
