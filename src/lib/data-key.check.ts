// Self-check for the data-key envelope — run with
// `npx tsx src/lib/data-key.check.ts`.
//
// The vector was made with Python's hashlib and `cryptography`, independent of
// both clients; the app's `test/auth/data_key_test.dart` opens the same one. If
// both pass, an envelope the panel re-wraps opens in the app and vice versa.
import assert from "node:assert/strict";
import { rewrapDataKey, unwrapDataKey, wrapDataKey } from "./data-key";

const PASSWORD = "correct horse battery staple";
const VECTOR = JSON.stringify({
  version: 1,
  kdf: "pbkdf2-sha256",
  iterations: 1000,
  salt: "AAECAwQFBgcICQoLDA0ODw==",
  nonce: "ZGVmZ2hpamtsbW5v",
  wrapped: "xbDBzZReIQAxvn9wzUW+/0d2Bclb/HMMoCUlyDyJndiEwIAOxxucOYX1DQ2AmfJ/",
});
const VECTOR_KEY = Uint8Array.from({ length: 32 }, (_, index) => 32 + index);

async function main() {
  assert.deepEqual(await unwrapDataKey(VECTOR, PASSWORD), VECTOR_KEY);
  assert.equal(await unwrapDataKey(VECTOR, "wrong one"), null);
  assert.equal(await unwrapDataKey("not json", PASSWORD), null);
  assert.equal(await unwrapDataKey(JSON.stringify({ version: 2 }), PASSWORD), null);

  const wrapped = await wrapDataKey(VECTOR_KEY, PASSWORD, 1000);
  assert.deepEqual(await unwrapDataKey(wrapped, PASSWORD), VECTOR_KEY);
  assert.equal(JSON.parse(wrapped).iterations, 1000);

  const rewrapped = await rewrapDataKey(VECTOR, PASSWORD, "a brand new password");
  assert.ok(rewrapped);
  assert.equal(JSON.parse(rewrapped).iterations, 600000);
  assert.deepEqual(await unwrapDataKey(rewrapped, "a brand new password"), VECTOR_KEY);
  assert.equal(await unwrapDataKey(rewrapped, PASSWORD), null);
  assert.equal(await rewrapDataKey(VECTOR, "wrong one", "a brand new password"), null);

  console.log("data-key: all checks passed");
}

main();
