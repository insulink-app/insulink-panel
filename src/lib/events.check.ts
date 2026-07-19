// Self-check for the event categorisation — run with
// `npx tsx src/lib/events.check.ts`.
import assert from "node:assert/strict";
import {
  categoryOf,
  countByCategory,
  dailyEventCounts,
  eventValue,
} from "./events";
import type { EventEntry } from "@/api/services/event-service";

// Every known type maps to its category; unknowns fall back to "other".
assert.equal(categoryOf("glucose_low_urgent"), "low");
assert.equal(categoryOf("glucose_high"), "high");
assert.equal(categoryOf("signal_loss"), "signal");
assert.equal(categoryOf("new_sensor"), "sensor");
assert.equal(categoryOf("sensor_stopped"), "sensor");
assert.equal(categoryOf("something_new"), "other");

// Glucose events carry a mg/dL value; others carry none.
assert.equal(eventValue({ type: "glucose_low", data: "62", time: 0 }), 62);
assert.equal(eventValue({ type: "new_sensor", data: "", time: 0 }), null);
assert.equal(eventValue({ type: "glucose_low", data: "x", time: 0 }), null);

const sample: EventEntry[] = [
  { type: "glucose_low", data: "60", time: new Date(2026, 0, 1, 8).getTime() },
  { type: "glucose_high", data: "220", time: new Date(2026, 0, 1, 20).getTime() },
  { type: "signal_loss", data: "", time: new Date(2026, 0, 2, 3).getTime() },
];

const counts = countByCategory(sample);
assert.equal(counts.find((entry) => entry.category === "low")!.count, 1);
assert.equal(counts.find((entry) => entry.category === "sensor")!.count, 0);

// Two distinct local days; day one holds the low + high.
const days = dailyEventCounts(sample);
assert.equal(days.length, 2);
assert.equal(days[0].low, 1);
assert.equal(days[0].high, 1);
assert.equal(days[1].signal, 1);

console.log("events: ok");
