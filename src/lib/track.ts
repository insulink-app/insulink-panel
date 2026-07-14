// Recorded GPS fix. `t` is epoch milliseconds, like every other timestamp.
export type TrackPoint = { lat: number; lng: number; t: number };

// The position along `ordered` (sorted by time) at `time`, linearly blended
// between the two fixes that bracket it — so a marker driven by this glides
// instead of snapping from fix to fix. Times outside the track clamp to its
// first/last fix. Returns null when there is nothing to place.
// ponytail: linear scan; a binary search only pays off at track lengths a phone
// won't produce.
export function positionAt(ordered: TrackPoint[], time: number | null) {
  if (ordered.length === 0 || time == null) {
    return null;
  }
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (time <= first.t) {
    return { lat: first.lat, lng: first.lng };
  }
  if (time >= last.t) {
    return { lat: last.lat, lng: last.lng };
  }
  let index = 0;
  while (index < ordered.length - 1 && ordered[index + 1].t < time) {
    index += 1;
  }
  const before = ordered[index];
  const after = ordered[index + 1];
  const span = after.t - before.t;
  const fraction = span > 0 ? (time - before.t) / span : 0;
  return {
    lat: before.lat + (after.lat - before.lat) * fraction,
    lng: before.lng + (after.lng - before.lng) * fraction,
  };
}
