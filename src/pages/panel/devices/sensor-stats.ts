// What a sensor measured while it ran, for its detail page and the comparison.
import type { GlucoseEntry } from "@/api/services/glucose-service";
import type { DeviceRecord } from "./records";

/** A pause longer than this many reading intervals counts as a signal loss. */
const LOSS_INTERVALS = 3;

export interface SensorStats {
  count: number;
  expected: number;
  coverage: number;
  average: number;
  min: number;
  max: number;
  /** Shares in percent above, inside and below the target range. */
  high: number;
  inRange: number;
  low: number;
  losses: number;
  longestGapMs: number;
  last?: number;
}

/** The readings from the sensor's start to when it came off (or now), oldest first. */
export function sensorReadings(record: DeviceRecord, entries: GlucoseEntry[]): GlucoseEntry[] {
  const end = record.end ?? Date.now();
  return entries.filter((entry) => entry.time >= record.start && entry.time <= end).sort((left, right) => left.time - right.time);
}

/** Null when the sensor delivered no reading at all. */
export function sensorStats(readings: GlucoseEntry[], record: DeviceRecord, intervalMs: number, low: number, high: number): SensorStats | null {
  if (readings.length === 0) {
    return null;
  }
  const values = readings.map((reading) => reading.value);
  const share = (count: number) => Math.round((count / values.length) * 100);
  const gaps = readings.slice(1).map((reading, index) => reading.time - readings[index].time);
  const expected = Math.max(1, Math.round(record.worn / intervalMs));
  return {
    count: readings.length,
    expected,
    coverage: Math.min(100, Math.round((readings.length / expected) * 100)),
    average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
    high: share(values.filter((value) => value > high).length),
    inRange: share(values.filter((value) => value >= low && value <= high).length),
    low: share(values.filter((value) => value < low).length),
    losses: gaps.filter((gap) => gap > LOSS_INTERVALS * intervalMs).length,
    longestGapMs: Math.max(0, ...gaps),
    last: readings[readings.length - 1].time,
  };
}
