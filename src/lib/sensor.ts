// Sensor runtime maths. Kept out of `sensor-service.ts` so it stays free of the
// Axios client — pure functions over the history entries, testable in node.
import type { SensorHistoryEntry } from "@/api/services/sensor-service";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The fields the panel reads out of the otherwise opaque `data` blob. The app's
 * `sensor_sync.dart` writes it; `resolved_key` is the physical sensor's own id.
 */
interface SensorBlob {
  sensor_start?: number;
  resolved_key?: string;
  // The four-digit code on a Dexcom G7 applicator; absent for a Libre 3.
  pairing_code?: string;
}

export function sensorBlob(sensor: SensorHistoryEntry): SensorBlob {
  try {
    const parsed = JSON.parse(sensor.data);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * When the session really started — NOT `registered_at`. The app POSTs the
 * registration only once the sensor identity is complete (`sensor_sync.dart`),
 * and the backend stamps `registered_at` on arrival, so a late pairing or a
 * reinstall that re-registers a running sensor lands hours or days into its
 * life. `expires_at` is anchored on this start instead, which is why
 * `expires_at - registered_at` is not a lifetime at all.
 *
 * Falls back to `registered_at` for blobs written before the app sent a start.
 */
export function sensorStart(sensor: SensorHistoryEntry): number {
  return sensorBlob(sensor).sensor_start ?? sensor.registered_at;
}

/**
 * One entry per physical sensor, earliest registration kept. A reinstall
 * restores the running sensor and re-registers it (the local backend id is
 * gone), so the same `resolved_key` can hold several rows.
 */
export function uniqueSensors(
  allSensors: SensorHistoryEntry[],
): SensorHistoryEntry[] {
  const byKey = new Map<string, SensorHistoryEntry>();
  for (const sensor of allSensors) {
    // No key (a blob too old to carry one) can't be matched up, so it stands
    // alone under its own id.
    const key = sensorBlob(sensor).resolved_key ?? sensor.id;
    const seen = byKey.get(key);
    if (!seen || sensor.registered_at < seen.registered_at) {
      byKey.set(key, sensor);
    }
  }
  return [...byKey.values()];
}

/** The starts of every sensor that began after this one. */
function successorStarts(
  sensor: SensorHistoryEntry,
  allSensors: SensorHistoryEntry[],
): number[] {
  const start = sensorStart(sensor);
  return uniqueSensors(allSensors)
    .map(sensorStart)
    .filter((otherStart) => otherStart > start);
}

/**
 * Still on the body: not discarded, not past its expiry, and not already
 * succeeded by a sensor that started later.
 *
 * The succession half matters because a sensor swapped out early keeps a future
 * `expires_at`, so expiry alone would show two as active. `discarded_at` covers
 * what succession cannot: a sensor pulled off or failed, with no replacement put
 * on yet. That leaves a future expiry and no successor, so without this the
 * panel goes on calling a dead sensor active while the app has already stopped
 * offering it.
 */
export function sensorActive(
  sensor: SensorHistoryEntry,
  allSensors: SensorHistoryEntry[],
): boolean {
  if (sensor.discarded_at) {
    return false;
  }
  return (
    successorStarts(sensor, allSensors).length === 0 &&
    sensor.expires_at > Date.now()
  );
}

/**
 * When the sensor came off — its expiry, or the start of the next one if that
 * came first. `null` while it is still running.
 */
export function sensorEndedAt(
  sensor: SensorHistoryEntry,
  allSensors: SensorHistoryEntry[],
): number | null {
  if (sensorActive(sensor, allSensors)) {
    return null;
  }
  // A discarded sensor ended when the user said so, unless something ended it
  // earlier. Falling back to `expires_at` would credit it with hours it spent in
  // the bin.
  const discarded = sensor.discarded_at ?? Number.POSITIVE_INFINITY;
  return Math.min(
    sensor.expires_at,
    discarded,
    ...successorStarts(sensor, allSensors),
  );
}

/**
 * How long the sensor was really worn: from its session start up to now while
 * it runs, else up to the end above.
 */
export function sensorWornMs(
  sensor: SensorHistoryEntry,
  allSensors: SensorHistoryEntry[],
): number {
  const end = sensorEndedAt(sensor, allSensors) ?? Date.now();
  return Math.max(0, end - sensorStart(sensor));
}

/**
 * The whole session the sensor reports: its rated lifetime plus the grace the
 * hardware tacks on (a G7 reports 907200 s — 10 d + 12 h).
 */
export function sensorSessionMs(sensor: SensorHistoryEntry): number {
  return sensor.expires_at - sensorStart(sensor);
}

/**
 * Whole rated days, floored — the app floors the same way
 * (`SensorLifespan.totalDays`): a G7's 10.5 d session is a 10-day sensor, not
 * an 11-day one.
 */
export function sensorRatedMs(sensor: SensorHistoryEntry): number {
  return Math.floor(sensorSessionMs(sensor) / DAY_MS) * DAY_MS;
}

/** The grace window past the rated lifetime (~12 h on a G7). */
export function sensorGraceMs(sensor: SensorHistoryEntry): number {
  return sensorSessionMs(sensor) - sensorRatedMs(sensor);
}

type Translate = (key: string, vars?: Record<string, number>) => string;

/** A span as "8d 4h", dropping the days once it is under one. */
export function formatSpan(ms: number, t: Translate): string {
  const totalHours = Math.max(0, Math.round(ms / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) {
    return t("devices.span_hours", { hours });
  }
  return t("devices.span_days_hours", { days, hours });
}
