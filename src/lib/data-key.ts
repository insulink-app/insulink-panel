/**
 * The account's wrapped data key, re-wrapped when the password changes here.
 *
 * The app seals the pod key it mirrors to the account with a data key that the
 * server only holds wrapped with a key derived from the password (the app's
 * `docs/POD_KEY_ENCRYPTION.md`). A password change has to send the data key
 * wrapped for the new password, or a reinstalled app could never open the pod
 * key again; the api refuses the change without it (1006). Everything here is
 * WebCrypto, matching the app's envelope byte for byte:
 *
 *   {"version": 1, "kdf": "pbkdf2-sha256", "iterations": 600000,
 *    "salt": "<16 bytes>", "nonce": "<12 bytes>", "wrapped": "<48 bytes>"}
 */

export const DATA_KEY_ITERATIONS = 600000;
const MAXIMUM_ITERATIONS = 5000000;

interface Envelope {
  version: number;
  kdf: string;
  iterations: number;
  salt: string;
  nonce: string;
  wrapped: string;
}

const fromBase64 = (text: string) =>
  Uint8Array.from(atob(text), (character) => character.charCodeAt(0));

const toBase64 = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

const randomBytes = (length: number) =>
  crypto.getRandomValues(new Uint8Array(length));

async function wrappingKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** The data key inside an envelope, or null for a wrong password or an unknown format. */
export async function unwrapDataKey(
  envelope: string,
  password: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const fields = JSON.parse(envelope) as Envelope;
    if (
      fields.version !== 1 ||
      fields.kdf !== "pbkdf2-sha256" ||
      fields.iterations > MAXIMUM_ITERATIONS
    ) {
      return null;
    }
    const key = await wrappingKey(password, fromBase64(fields.salt), fields.iterations);
    const opened = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(fields.nonce) },
      key,
      fromBase64(fields.wrapped),
    );
    return new Uint8Array(opened);
  } catch {
    return null;
  }
}

export async function wrapDataKey(
  dataKey: Uint8Array<ArrayBuffer>,
  password: string,
  iterations = DATA_KEY_ITERATIONS,
): Promise<string> {
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const key = await wrappingKey(password, salt, iterations);
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, dataKey);
  return JSON.stringify({
    version: 1,
    kdf: "pbkdf2-sha256",
    iterations,
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    wrapped: toBase64(new Uint8Array(wrapped)),
  });
}

/** The envelope for the new password, or null when the current one does not open it. */
export async function rewrapDataKey(
  envelope: string,
  current: string,
  next: string,
): Promise<string | null> {
  const dataKey = await unwrapDataKey(envelope, current);
  return dataKey ? wrapDataKey(dataKey, next) : null;
}
