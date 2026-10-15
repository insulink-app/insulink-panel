// Seeded PRNG (mulberry32) so every demo visit draws the same sample account.
let seed = 20260101;

/** A uniform number in [0, 1). */
export function random(): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
}

/** A uniform number in [low, high). */
export function between(low: number, high: number): number {
  return low + random() * (high - low);
}

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const DEMO_DAYS = 14;

/** Now, floored to the minute, the anchor every generated series ends at. */
export const NOW = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;

/** Local midnight `daysAgo` days back. */
export function midnight(daysAgo: number): number {
  const day = new Date(NOW - daysAgo * DAY_MS);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}
