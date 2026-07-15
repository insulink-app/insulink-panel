import type { TrackPoint } from "@/lib/track";

export type KmSplit = { index: number; km: number; paceSecPerKm: number };

// Great-circle distance between two coordinates in metres (haversine).
function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radius = 6371000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

// Per-kilometre splits from a GPS track, interpolating the exact time each km
// mark is crossed within its segment (so a split isn't rounded to a fix
// boundary). The final entry is the leftover distance (< 1 km). Mirrors the
// app's kmSplits().
export function kmSplits(track: TrackPoint[]): KmSplit[] {
  if (track.length < 2) {
    return [];
  }
  const splits: KmSplit[] = [];
  let cumDist = 0;
  let boundaryDist = 0;
  let boundaryMs = track[0].t;
  for (let index = 1; index < track.length; index += 1) {
    const prev = track[index - 1];
    const curr = track[index];
    const segStart = cumDist;
    const segDist = distanceM(prev.lat, prev.lng, curr.lat, curr.lng);
    cumDist += segDist;
    while (cumDist >= boundaryDist + 1000) {
      const target = boundaryDist + 1000;
      const into = segDist === 0 ? 0 : (target - segStart) / segDist;
      const crossMs = prev.t + (curr.t - prev.t) * into;
      splits.push({
        index: splits.length + 1,
        km: 1,
        paceSecPerKm: (crossMs - boundaryMs) / 1000,
      });
      boundaryDist = target;
      boundaryMs = crossMs;
    }
  }
  const leftover = cumDist - boundaryDist;
  if (leftover > 50) {
    const km = leftover / 1000;
    const seconds = (track[track.length - 1].t - boundaryMs) / 1000;
    splits.push({
      index: splits.length + 1,
      km,
      paceSecPerKm: km > 0 ? seconds / km : 0,
    });
  }
  return splits;
}
