// Self-check for the glucose classification — run with
// `npx tsx src/lib/glucose.check.ts`.
// These thresholds decide what colour a reading shows in, so the boundaries are
// pinned exactly: the target edges themselves read as in-range (strict < and >),
// and the 54/250 extremes stay inside a target the user has widened past them.
import assert from "node:assert/strict";
import {
  bandRange,
  classify,
  classifyBand,
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  GLUCOSE_BANDS,
  toDisplay,
  unitLabel,
  VERY_HIGH,
  VERY_LOW,
} from "./glucose";

// The edges belong to the target, not to low/high.
assert.equal(classify(DEFAULT_TARGET_LOW), "in-range");
assert.equal(classify(DEFAULT_TARGET_HIGH), "in-range");
assert.equal(classify(DEFAULT_TARGET_LOW - 1), "low");
assert.equal(classify(DEFAULT_TARGET_HIGH + 1), "high");
assert.equal(classify(120), "in-range");

// Custom targets override the defaults.
assert.equal(classify(85, 90, 160), "low");
assert.equal(classify(170, 90, 160), "high");
assert.equal(classify(120, 90, 160), "in-range");

// Five bands, same edge convention.
assert.equal(classifyBand(VERY_LOW - 1), "very-low");
assert.equal(classifyBand(VERY_LOW), "low");
assert.equal(classifyBand(DEFAULT_TARGET_LOW - 1), "low");
assert.equal(classifyBand(DEFAULT_TARGET_LOW), "in-range");
assert.equal(classifyBand(DEFAULT_TARGET_HIGH), "in-range");
assert.equal(classifyBand(DEFAULT_TARGET_HIGH + 1), "high");
assert.equal(classifyBand(VERY_HIGH), "high");
assert.equal(classifyBand(VERY_HIGH + 1), "very-high");

// A target widened past the extremes wins over the standard cut-offs: someone
// whose target starts at 30 is in range at 40, not "very low" because 40 < 54.
assert.equal(classifyBand(40, 30, 300), "in-range");
assert.equal(classifyBand(100, 30, 300), "in-range");
assert.equal(classifyBand(280, 30, 300), "in-range");
// Past their own edges the extremes still resolve.
assert.equal(classifyBand(20, 30, 300), "very-low");
assert.equal(classifyBand(350, 30, 300), "very-high");
// ponytail: when low <= 54 the "low" band is unreachable — everything under the
// target reads "very-low", since both cut-offs collapse onto `low`. Same for
// "high" when high >= 250. Degenerate but defensible; split the extremes off
// the target edges if a range bar ever needs to show both.

// Every band a bar can draw must classify to something in the list.
for (const mgdl of [20, 54, 60, 70, 120, 180, 200, 250, 400]) {
  assert.ok(GLUCOSE_BANDS.includes(classifyBand(mgdl)), `unlisted band at ${mgdl}`);
}

// mg/dL is storage; mmol/L is display-only, a pure /18 to one decimal.
assert.equal(toDisplay(180), "180");
assert.equal(toDisplay(180.4), "180");
assert.equal(toDisplay(180, "mmol"), "10.0");
assert.equal(toDisplay(90, "mmol"), "5.0");
assert.equal(unitLabel(), "mg/dL");
assert.equal(unitLabel("mmol"), "mmol/L");

// Ranges are spelled in the display unit, with the unit named once.
assert.equal(bandRange("in-range"), "70–180 mg/dL");
assert.equal(bandRange("very-high"), "> 250 mg/dL");
assert.equal(bandRange("very-low"), "< 54 mg/dL");
assert.equal(bandRange("in-range", 70, 180, "mmol"), "3.9–10.0 mmol/L");

console.log("glucose: ok");
