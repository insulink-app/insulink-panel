// npx tsx src/pages/panel/devices/sensor-stats.check.ts
import assert from "node:assert/strict";
import type { DeviceRecord } from "./records";
import { sensorStats } from "./sensor-stats";

const MINUTE = 60_000;
const record = { start: 0, worn: 60 * MINUTE } as DeviceRecord;
const readings = [0, 5, 10, 40, 45, 50].map((minute, index) => ({ time: minute * MINUTE, value: [60, 100, 120, 200, 150, 130][index] }));
const stats = sensorStats(readings, record, 5 * MINUTE, 70, 180)!;
assert.equal(stats.expected, 12);
assert.equal(stats.coverage, 50);
assert.equal(stats.losses, 1);
assert.equal(stats.longestGapMs, 30 * MINUTE);
assert.equal(stats.low, 17);
assert.equal(stats.high, 17);
assert.equal(stats.inRange, 67);
console.log("sensor stats: ok");
