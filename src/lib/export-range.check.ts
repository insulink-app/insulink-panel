// Self-check for the export range maths — run with
// `npx tsx src/lib/export-range.check.ts`.
// Silently dropping an edge day would hand the user an export they believe is
// complete, so the inclusive bounds are pinned.
import assert from "node:assert/strict";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { isRangeValid, rangeBounds } from "./export-range";

// Both ends inclusive, whole days: a single day as from *and* to must cover that
// day from 00:00:00.000 to 23:59:59.999, or picking "today" selects nothing.
const single = rangeBounds({ from: "2026-07-15", to: "2026-07-15" });
assert.equal(single.from, new Date(2026, 6, 15, 0, 0, 0, 0).getTime());
assert.equal(single.to, new Date(2026, 6, 15, 23, 59, 59, 999).getTime());
assert.ok(single.to - single.from === 86_400_000 - 1);

// A reading at either edge of that day is inside the range.
for (const edge of [single.from, single.to]) {
  assert.ok(edge >= single.from && edge <= single.to);
}
// One millisecond either side is outside.
assert.ok(single.from - 1 < single.from);
assert.ok(single.to + 1 > single.to);

// An open end means unbounded, not "now" — an omitted `from` must still reach
// back to the very first reading.
const openFrom = rangeBounds({ to: "2026-07-15" });
assert.equal(openFrom.from, -Infinity);
const openTo = rangeBounds({ from: "2026-07-15" });
assert.equal(openTo.to, Infinity);
const openBoth = rangeBounds({});
assert.equal(openBoth.from, -Infinity);
assert.equal(openBoth.to, Infinity);

// `health_days` keys off a bare "yyyy-MM-dd". parseISO reads it as LOCAL
// midnight, which is what keeps the edge day inside the range; Date.parse reads
// it as UTC midnight and would push it out of a same-day range anywhere west of
// Greenwich. Pin the property that matters rather than the timezone.
const dayKey = "2026-07-15";
const parsed = parseISO(dayKey).getTime();
assert.ok(
  parsed >= single.from && parsed <= single.to,
  "a day key must fall inside a range covering that same day",
);
assert.equal(parsed, startOfDay(parseISO(dayKey)).getTime());
assert.ok(endOfDay(parseISO(dayKey)).getTime() <= single.to);

// Validation is a trust boundary: a reversed range must be rejected, an equal
// one accepted, and an incomplete one never blocks the user mid-typing.
assert.equal(isRangeValid({ from: "2026-07-01", to: "2026-07-15" }), true);
assert.equal(isRangeValid({ from: "2026-07-15", to: "2026-07-15" }), true);
assert.equal(isRangeValid({ from: "2026-07-16", to: "2026-07-15" }), false);
assert.equal(isRangeValid({ from: "2026-07-15" }), true);
assert.equal(isRangeValid({ to: "2026-07-15" }), true);
assert.equal(isRangeValid({}), true);

console.log("export-range.check.ts OK");
