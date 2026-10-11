// npx tsx src/pages/panel/activity/items.check.ts
import assert from "node:assert/strict";
import { heatmapDays, matchesFilter, type ActivityItem } from "./items";

const now = new Date(2026, 9, 9, 12); // a Friday
const walk: ActivityItem = { kind: "training", at: new Date(2026, 9, 9, 8).getTime(), data: { id: "t", type: "walk", start: 0, end: 0, dist: 0 } };
const days = heatmapDays([walk, walk], now);
assert.equal(days.length, 35);
assert.equal(new Date(days[0].day).getDay(), 1);
assert.equal(days.find((day) => day.day === new Date(2026, 9, 9).getTime())?.count, 2);
assert.equal(days[days.length - 1].future, true);
assert.equal(matchesFilter(walk, "walk"), true);
assert.equal(matchesFilter(walk, "workout"), false);
console.log("activity items: ok");
