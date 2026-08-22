// Self-check for the pod runtime maths — run with
// `npx tsx src/lib/pump.check.ts`.
//
// Guards two traps. First, the one the sensor check also guards: `registered_at`
// is when the app POSTed the registration, not when the pod started, so a
// lifetime measured from it is nonsense. Second, a pod-only one: every pod this
// app activates gets the SAME `unique_id` (it is derived from the controller id),
// so the id cannot tell two pods apart — the activation time has to.
import assert from "node:assert/strict";
import type { PumpHistoryEntry } from "@/api/services/pump-service";
import {
  POD_RATED_MS,
  podActive,
  podDeliveredUnits,
  podEndedAt,
  podGraceMs,
  podInGrace,
  podLotLabel,
  podRatedMs,
  podReservoirUnits,
  podStart,
  podWornMs,
  uniquePods,
} from "./pump";

const HOUR = 60 * 60 * 1000;
const now = Date.now();

/** A pod's reported session: 72 rated hours plus an 8 h grace window. */
const POD_SESSION = 80 * HOUR;

/** A pod activated at `startedAt`, registered by the app `lagMs` later. */
const pod = (
  startedAt: number,
  lagMs = 0,
  extra: Record<string, unknown> = {},
): PumpHistoryEntry => ({
  id: `${startedAt}-${lagMs}`,
  data: JSON.stringify({
    pump_type: "OMNIPOD_DASH",
    unique_id: 4241,
    lot_number: 135556289,
    pod_sequence_number: 681767,
    activated_at: startedAt,
    expiry_hours: 80,
    ...extra,
  }),
  registered_at: startedAt + lagMs,
  expires_at: startedAt + POD_SESSION,
});

// The start comes from the blob, not from when the app got round to registering.
{
  const restoredLate = pod(now - 30 * HOUR, 29 * HOUR);
  assert.equal(podStart(restoredLate), now - 30 * HOUR);
  assert.ok(
    podWornMs(restoredLate, [restoredLate]) > 29 * HOUR,
    "a pod registered late must still count from its activation",
  );
}

// A restore re-registers the SAME pod; both rows must collapse to one.
{
  const startedAt = now - 10 * HOUR;
  const rows = [pod(startedAt, 0), pod(startedAt, 5 * HOUR)];
  assert.equal(uniquePods(rows).length, 1);
  assert.equal(uniquePods(rows)[0].registered_at, startedAt);
}

// Two different pods share a unique_id but not an activation time.
{
  const older = pod(now - 100 * HOUR);
  const newer = pod(now - 10 * HOUR);
  assert.equal(uniquePods([older, newer]).length, 2);
}

// Only the newest pod is active, even though the replaced one keeps a future
// expiry.
{
  const replaced = pod(now - 20 * HOUR);
  const current = pod(now - 2 * HOUR);
  const all = [replaced, current];
  assert.equal(podActive(current, all), true);
  assert.equal(
    podActive(replaced, all),
    false,
    "a pod taken off early must not read as active",
  );
  assert.equal(podEndedAt(replaced, all), podStart(current));
  assert.equal(podEndedAt(current, all), null);
}

// A pod that simply ran out is not "replaced early".
{
  const expired = pod(now - 100 * HOUR);
  assert.equal(podActive(expired, [expired]), false);
  assert.equal(podEndedAt(expired, [expired]), expired.expires_at);
}

// The rated/grace split matches the app's bar: three rated days, 8 h of grace.
{
  const fresh = pod(now - HOUR);
  assert.equal(podRatedMs(fresh), POD_RATED_MS);
  assert.equal(podGraceMs(fresh), 8 * HOUR);
  assert.equal(podInGrace(fresh, [fresh]), false);
}

// Past 72 h a running pod is in its grace window, not expired.
{
  const late = pod(now - 75 * HOUR);
  assert.equal(podActive(late, [late]), true);
  assert.equal(podInGrace(late, [late]), true);
}

// Reservoir and delivery are absent until a contact has been synced, and are
// never invented.
{
  const neverSeen = pod(now - HOUR);
  assert.equal(podReservoirUnits(neverSeen), null);
  assert.equal(podDeliveredUnits(neverSeen), null);

  const seen = pod(now - HOUR, 0, {
    reservoir_units: 42.5,
    total_delivered_units: 12.75,
    last_seen_at: now,
  });
  assert.equal(podReservoirUnits(seen), 42.5);
  assert.equal(podDeliveredUnits(seen), 12.75);
}

// A malformed blob degrades instead of throwing.
{
  const broken: PumpHistoryEntry = {
    id: "broken",
    data: "not json",
    registered_at: now,
    expires_at: now + POD_SESSION,
  };
  assert.equal(podStart(broken), now);
  assert.equal(podReservoirUnits(broken), null);
  assert.equal(podLotLabel(broken), null);
}

assert.equal(podLotLabel(pod(now)), "135556289 / 681767");

console.log("pump.check.ts: all assertions passed");

// A pod the user said is gone is not active, however much of its expiry is left.
// Succession cannot answer this: a pod that faulted or was deactivated with no
// replacement yet has a future `expires_at` and no successor, so without
// `discarded_at` the panel went on calling a dead pod active while the app had
// already stopped offering it.
{
  const now = Date.now();
  const discarded = {
    id: "discarded",
    data: JSON.stringify({ activated_at: now - 2 * HOUR }),
    registered_at: now - 2 * HOUR,
    expires_at: now + POD_SESSION,
    discarded_at: now - HOUR,
  };
  assert.equal(podActive(discarded, [discarded]), false);

  // And it ended when the user said so, not when it would have expired: crediting
  // it to `expires_at` would count hours it spent in the bin as worn.
  assert.equal(podEndedAt(discarded, [discarded]), now - HOUR);

  // An undiscarded pod in the same position is still active, so the flag is what
  // decided it and not something else about the fixture.
  const { discarded_at: _ignored, ...running } = discarded;
  assert.equal(podActive(running, [running]), true);
}

console.log("pump.check.ts: discard assertions passed");

