// npx tsx src/pages/panel/nutrition/daily.check.ts
import assert from "node:assert/strict";
import { dailyBuckets, topCounts } from "./daily";

const now = new Date(2026, 9, 9, 12);
const rows = [
  { at: new Date(2026, 9, 9, 8).getTime(), carbs: 20 },
  { at: new Date(2026, 9, 9, 18).getTime(), carbs: 10 },
  { at: new Date(2026, 9, 3, 8).getTime(), carbs: 5 },
  { at: new Date(2026, 9, 1, 8).getTime(), carbs: 99 },
];
const days = dailyBuckets(rows, (row) => row.at, (row) => row.carbs, 7, now);
assert.equal(days.length, 7);
assert.equal(days[6].value, 30);
assert.equal(days[0].value, 5);
assert.equal(days.reduce((sum, day) => sum + day.value, 0), 35);
const top = topCounts(["Brot", "Joghurt", "Brot", "Apfel", "Brot", "Joghurt"], 2);
assert.deepEqual(top, [
  { label: "Brot", count: 3 },
  { label: "Joghurt", count: 2 },
]);
console.log("nutrition daily: ok");
