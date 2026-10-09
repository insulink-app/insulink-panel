// npx tsx src/pages/panel/body/series.check.ts
import assert from "node:assert/strict";
import { withWeeklyAverage } from "./series";

const DAY = 24 * 60 * 60 * 1000;
const points = [0, 1, 2, 10].map((day, index) => ({ t: day * DAY, value: [70, 72, 74, 80][index] }));
const averaged = withWeeklyAverage(points);
assert.equal(averaged[2].average, 72);
assert.equal(averaged[3].average, 80);
console.log("body series: ok");
