// Self-check for the basal curve maths — run with `npx tsx src/lib/basal.check.ts`.
// Guards the two things a wrong curve would silently break: the generated total
// matches the requested daily amount, and a profile survives a save/load round
// trip through the settings blob.
import assert from "node:assert/strict";
import {
  BASAL_STEP,
  decodeProfiles,
  deliveredTotal,
  encodeProfiles,
  initialProfile,
  regenerate,
  snapRate,
} from "./basal";

const generated = regenerate({ ...initialProfile("Test"), total: 20 });
// Rounding every hour to 0.05 U/h drifts at most half a step per hour.
assert.ok(Math.abs(deliveredTotal(generated) - 20) <= 24 * BASAL_STEP * 0.5);
assert.ok(generated.rates.every((rate) => rate >= 0 && rate <= 5));
// The 05:00 peak must lift the early morning above the quiet afternoon.
assert.ok(generated.rates[5] > generated.rates[17]);
// Peaks wrap around midnight, so the last hour is lifted too.
assert.ok(generated.rates[23] > generated.rates[17]);

assert.equal(snapRate(1.03), 1.05);
assert.equal(snapRate(-1), 0);
assert.equal(snapRate(99), 5);
assert.deepEqual(regenerate({ ...initialProfile("Zero"), total: 0 }).rates, Array(24).fill(0));

const state = { active: 1, profiles: [initialProfile("A"), generated] };
assert.deepEqual(decodeProfiles(encodeProfiles(state)), state);
// Junk falls back to one default profile instead of throwing.
assert.equal(decodeProfiles("not json").profiles.length, 1);
assert.equal(decodeProfiles(undefined).active, 0);
assert.equal(decodeProfiles('{"active":9,"profiles":[]}').profiles[0].name, "Standard");

console.log("basal checks passed");
