// Self-check for the glucose trend: run with `npx tsx src/lib/glucose-trend.check.ts`.
// Pins what made the arrow jumpy: a single noisy reading must not turn a flat
// course into a steep arrow, while a real steady rise still shows as one.
import assert from "node:assert/strict";
import { trendDirection, trendPerMinute } from "./glucose-trend";

const at = (minute: number, value: number) => ({ time: minute * 60_000, value });

// Flat, then one reading 10 higher: two points would say +2/min ("up").
const spike = trendPerMinute([at(0, 120), at(5, 120), at(10, 120), at(15, 130)])!;
assert.equal(trendDirection(spike), "flat");

// A steady 1.5 mg/dL per minute is a real rise.
const rising = trendPerMinute([at(0, 100), at(5, 107.5), at(10, 115), at(15, 122.5)])!;
assert.ok(Math.abs(rising - 1.5) < 1e-9);
assert.equal(trendDirection(rising), "up_right");

// Zigzag noise around a flat line stays flat.
const zigzag = trendPerMinute([at(0, 118), at(5, 124), at(10, 117), at(15, 123)])!;
assert.equal(trendDirection(zigzag), "flat");

// Readings older than the window do not count; too short a span says nothing.
assert.equal(trendPerMinute([at(0, 60), at(30, 120), at(35, 120), at(40, 120), at(45, 120)]), 0);
assert.equal(trendPerMinute([at(0, 120), at(5, 140)]), undefined);

assert.equal(trendDirection(-2.5), "down");
assert.equal(trendDirection(-1.5), "down_right");

console.log("glucose-trend check ok");
