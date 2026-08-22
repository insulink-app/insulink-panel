// Self-check for the sensor runtime maths — run with
// `npx tsx src/lib/sensor.check.ts`.
// Guards the trap this logic exists for: `registered_at` is when the app POSTed
// the registration, not when the sensor started, so a lifetime measured from it
// is nonsense (a restored sensor reads as worn for hours). The start lives in
// the blob's `sensor_start`.
import assert from "node:assert/strict";
import type { SensorHistoryEntry } from "@/api/services/sensor-service";
import {
  sensorActive,
  sensorEndedAt,
  sensorGraceMs,
  sensorRatedMs,
  sensorStart,
  sensorWornMs,
  uniqueSensors,
} from "./sensor";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
// What a G7 reports: 10 rated days plus a 12 h grace window.
const G7_SESSION = 10 * DAY + 12 * HOUR;

/** A sensor started at `startedAt`, registered by the app `lagMs` later. */
const g7 = (
  startedAt: number,
  lagMs: number,
  key = String(startedAt),
): SensorHistoryEntry => ({
  id: `${key}-${lagMs}`,
  data: JSON.stringify({
    sensor_type: "dexcom_g7",
    resolved_key: key,
    sensor_start: startedAt,
  }),
  registered_at: startedAt + lagMs,
  expires_at: startedAt + G7_SESSION,
});

// The reported bug: a sensor restored onto a fresh install registers ~9.5 days
// into its life, leaving 19 h to expiry. Measured from `registered_at` it looks
// worn for 19 h; from its real start it ran its full term.
const restored = g7(now - 40 * DAY, G7_SESSION - 19 * HOUR);
assert.equal(restored.expires_at - restored.registered_at, 19 * HOUR);
assert.equal(sensorWornMs(restored, [restored]), G7_SESSION);
assert.equal(sensorStart(restored), now - 40 * DAY);

// Rated lifetime floors to whole days; the remainder is grace.
assert.equal(sensorRatedMs(restored), 10 * DAY);
assert.equal(sensorGraceMs(restored), 12 * HOUR);

// A reinstall re-registers the running sensor: same `resolved_key`, two rows.
// They collapse to one, and the duplicate never counts as a successor that
// would cut the original short.
const paired = g7(now - 20 * DAY, HOUR, "abc");
const reRegistered = g7(now - 20 * DAY, 5 * DAY, "abc");
const withDuplicate = [paired, reRegistered];
assert.equal(uniqueSensors(withDuplicate).length, 1);
assert.equal(uniqueSensors(withDuplicate)[0].id, paired.id);
assert.equal(sensorWornMs(paired, withDuplicate), G7_SESSION);

// Swapped out early: the successor's START ends it, 3 days in — not its expiry.
const swappedEarly = g7(now - 5 * DAY, HOUR);
const running = g7(now - 2 * DAY, HOUR);
const swapped = [swappedEarly, running];
assert.equal(sensorEndedAt(swappedEarly, swapped), sensorStart(running));
assert.equal(sensorWornMs(swappedEarly, swapped), 3 * DAY);

// Only the newest is active — the early-swapped one still has a future expiry,
// so expiry alone would wrongly call it active too.
assert.equal(sensorActive(running, swapped), true);
assert.equal(sensorActive(swappedEarly, swapped), false);
assert.equal(sensorActive(restored, [restored]), false);

// Active: worn counts up to now, and there is no end yet.
assert.equal(sensorEndedAt(running, swapped), null);
assert.ok(Math.abs(sensorWornMs(running, swapped) - 2 * DAY) < HOUR);

// A blob too old to carry a start falls back to `registered_at`.
const legacy: SensorHistoryEntry = {
  id: "legacy",
  data: "{}",
  registered_at: now - 30 * DAY,
  expires_at: now - 20 * DAY,
};
assert.equal(sensorStart(legacy), legacy.registered_at);
assert.equal(sensorWornMs(legacy, [legacy]), 10 * DAY);

console.log("sensor check ok");

// A sensor the user said is gone is not active, however much of its expiry is
// left. Succession cannot answer this: a sensor pulled off with no replacement
// yet has a future `expires_at` and no successor, so without `discarded_at` the
// panel went on calling a dead sensor active while the app had already stopped
// offering it.
{
  const now = Date.now();
  const discarded = {
    id: "discarded",
    data: JSON.stringify({ session_start: now - 2 * HOUR }),
    registered_at: now - 2 * HOUR,
    expires_at: now + G7_SESSION,
    discarded_at: now - HOUR,
  };
  assert.equal(sensorActive(discarded, [discarded]), false);

  // And it ended when the user said so, not when it would have expired.
  assert.equal(sensorEndedAt(discarded, [discarded]), now - HOUR);

  // An undiscarded sensor in the same position is still active, so the flag is
  // what decided it and not something else about the fixture.
  const { discarded_at: _ignored, ...running } = discarded;
  assert.equal(sensorActive(running, [running]), true);
}

console.log("sensor.check.ts: discard assertions passed");

