// Self-check for the activity detail's pace maths and formatters — run with
// `npx tsx src/pages/panel/activity-detail/splits.check.ts`.
// The formatters here spell durations out ("5m 30s"); the runner's formatClock
// ticks ("5:30"). The compiler cannot tell them apart, so pin the shape.
import assert from "node:assert/strict";
import type { TrackPoint } from "@/lib/track";
import { formatDuration, formatPace } from "./format";
import { kmSplits } from "./splits";

assert.equal(formatDuration(0), "0m 0s");
assert.equal(formatDuration(330), "5m 30s");
assert.equal(formatDuration(3900), "1h 5m");

// The unit comes from i18next, not a literal.
const translate = (key: string) => (key === "body.km" ? "KM-FROM-LOCALE" : key);
assert.equal(formatPace(330, translate), "5:30 /KM-FROM-LOCALE");
assert.equal(formatPace(0, translate), "–");
assert.equal(formatPace(-5, translate), "–");

assert.deepEqual(kmSplits([]), []);
assert.deepEqual(kmSplits([{ lat: 0, lng: 0, t: 0 }]), []);

// A straight run due north at a steady 5:00/km. One degree of latitude is
// ~111.19 km at the equator, so walk 3 km of it in 900 s.
const metresPerDegree = 111194.9;
const km = 3;
const track: TrackPoint[] = [];
for (let step = 0; step <= 30; step += 1) {
  const travelled = (km * 1000 * step) / 30;
  track.push({ lat: travelled / metresPerDegree, lng: 0, t: step * 30_000 });
}

const splits = kmSplits(track);
assert.equal(splits.length, 3);
assert.ok(splits.every((split) => split.km === 1));
assert.deepEqual(
  splits.map((split) => split.index),
  [1, 2, 3],
);
// Each km took 300 s; the boundary is interpolated inside a segment, so allow
// a second of slack rather than demanding an exact fix landing on the mark.
for (const split of splits) {
  assert.ok(Math.abs(split.paceSecPerKm - 300) < 1, `pace ${split.paceSecPerKm}`);
}

// A leftover over 50 m becomes a final partial split; under it is dropped.
const withLeftover = kmSplits([
  { lat: 0, lng: 0, t: 0 },
  { lat: 1500 / metresPerDegree, lng: 0, t: 450_000 },
]);
assert.equal(withLeftover.length, 2);
assert.ok(Math.abs(withLeftover[1].km - 0.5) < 0.01);

console.log("activity-detail splits: ok");
