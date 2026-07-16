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

const EARTH_RADIUS_M = 6371000;

// Great-circle distance between two fixes in metres (haversine).
function haversineMeters(before: TrackPoint, after: TrackPoint) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRad(after.lat - before.lat);
  const deltaLng = toRad(after.lng - before.lng);
  const chord =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(before.lat)) * Math.cos(toRad(after.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(chord));
}

// Instantaneous speed (km/h) over each track segment, timestamped at the segment
// midpoint. Derived from the GPS fixes — the track carries no stored speed.
// Segments with no elapsed time (a duplicate-timestamp fix) are skipped.
export function speedSeries(ordered: TrackPoint[]) {
  const points: { t: number; speed: number }[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const before = ordered[index - 1];
    const after = ordered[index];
    const seconds = (after.t - before.t) / 1000;
    if (seconds <= 0) {
      continue;
    }
    const speed = (haversineMeters(before, after) / seconds) * 3.6;
    points.push({ t: Math.round((before.t + after.t) / 2), speed });
  }
  return points;
}
