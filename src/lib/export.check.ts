// Self-check for the export serialisers — run with
// `npx tsx src/lib/export.check.ts`.
// A broken cell here silently corrupts a file the user hands to a medical
// importer, so the quoting rules and the Clarity out-of-range wording are pinned.
import assert from "node:assert/strict";
import { toCsv } from "./export";
import { clarityCsv, clarityGlucose } from "./clarity";

// Header is the union of every row's keys — a field only the second row carries
// must still get a column, and the row missing it an empty cell.
const csv = toCsv([{ a: 1 }, { a: 2, b: "x" }]);
assert.equal(csv, "a,b\n1,\n2,x");

// Anything that could break the row gets quoted; inner quotes double.
assert.equal(toCsv([{ v: "a,b" }]), 'v\n"a,b"');
assert.equal(toCsv([{ v: 'say "hi"' }]), 'v\n"say ""hi"""');
assert.equal(toCsv([{ v: "line\nbreak" }]), 'v\n"line\nbreak"');
assert.equal(toCsv([{ v: "plain" }]), "v\nplain");

// null and undefined are empty cells, not the strings "null"/"undefined".
assert.equal(toCsv([{ v: null }]), "v\n");
assert.equal(toCsv([{ v: undefined }]), "v\n");

// Nested values survive as JSON, quoted because the JSON itself holds commas.
assert.equal(toCsv([{ v: { n: 1, m: 2 } }]), 'v\n"{""n"":1,""m"":2}"');

// Clarity reports beyond-sensor-range readings as words; the bounds themselves
// are still real numbers.
assert.equal(clarityGlucose(39), "Low");
assert.equal(clarityGlucose(40), "40");
assert.equal(clarityGlucose(400), "400");
assert.equal(clarityGlucose(401), "High");
assert.equal(clarityGlucose(112.6), "113");

// Readings and meal events interleave by time, and Index counts the merged rows
// from 1 — a meal at 08:30 must land between the 08:00 and 09:00 readings.
const rows = clarityCsv(
  [
    { value: 118, time: new Date(2026, 0, 2, 9, 0, 0).getTime() },
    { value: 112, time: new Date(2026, 0, 2, 8, 0, 0).getTime() },
  ],
  [{ time: new Date(2026, 0, 2, 8, 30, 0).getTime(), carbs: 45, bolus: 4.5 }],
).split("\n");

assert.equal(rows.length, 5); // header + 2 readings + carbs + insulin
assert.match(rows[1], /^1,2026-01-02T08:00:00,EGV,,,,Insulink,112,,/);
assert.match(rows[2], /^2,2026-01-02T08:30:00,Carbs,,,,Insulink,,,45,/);
assert.match(rows[3], /^3,2026-01-02T08:30:00,Insulin,Fast-Acting,,,Insulink,,4\.5,/);
assert.match(rows[4], /^4,2026-01-02T09:00:00,EGV,,,,Insulink,118,,/);

// Every row carries exactly as many cells as the header declares, or the
// importer reads values off into the wrong columns.
const columnCount = rows[0].split(",").length;
for (const row of rows) {
  assert.equal(row.split(",").length, columnCount);
}

// A correction bolus has no carbs and a logged snack no insulin — neither may
// emit a phantom zero row for the other.
const correction = clarityCsv([], [{ time: Date.now(), bolus: 2 }]).split("\n");
assert.equal(correction.length, 2);
assert.match(correction[1], /,Insulin,Fast-Acting,/);

const snack = clarityCsv([], [{ time: Date.now(), carbs: 20 }]).split("\n");
assert.equal(snack.length, 2);
assert.match(snack[1], /,Carbs,/);

// Nothing logged is a header-only file, not a crash.
assert.equal(clarityCsv([], []).split("\n").length, 1);

console.log("export.check.ts OK");
