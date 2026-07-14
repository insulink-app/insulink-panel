import client from "../client";

// /sensor/current/ -> { success, id, data }. `data` is an opaque sensor blob;
// expiry (when present) is exposed by the backend as epoch MILLISECONDS.
export type SensorCurrentResponse = {
  success: boolean;
  id?: string;
  data?: string;
  type?: string;
  expires_at?: number;
};

const current = () =>
  client.get<SensorCurrentResponse>({ url: "/sensor/current/" });

// /sensor/history/ -> { success, sensors: [...] }. `registered_at`/`expires_at`
// are epoch MILLISECONDS; `data` is the opaque JSON blob (holds `sensor_type`).
export interface SensorHistoryEntry {
  id: string;
  data: string;
  registered_at: number; // epoch ms
  expires_at: number; // epoch ms
}

export type SensorHistoryResponse = {
  success: boolean;
  sensors?: SensorHistoryEntry[];
};

const history = () =>
  client.get<SensorHistoryResponse>({ url: "/sensor/history/" });

// Map a sensor type to a readable label. Keyed by both the blob's `sensor_type`
// wireKey and the backend `SensorType` name, so it works whichever the caller
// has.
export const SENSOR_TYPE_LABEL: Record<string, string> = {
  dexcom_g7: "Dexcom G7",
  DEXCOM_G7: "Dexcom G7",
  abbott_libre3: "Abbott Libre 3",
  ABBOTT_LIBRE3: "Abbott Libre 3",
};

// A missing/unrecognized type resolves to the Dexcom G7 — it was the original,
// sole CGM, so pre-multi-sensor blobs carry no `sensor_type`. This mirrors the
// app's SensorType.fromWireKey (orElse dexcomG7); without it, older G7
// registrations showed up as "unknown".
export function sensorType(data: string): string {
  try {
    const key = JSON.parse(data)?.sensor_type as string | undefined;
    return (key && SENSOR_TYPE_LABEL[key]) || SENSOR_TYPE_LABEL.dexcom_g7;
  } catch {
    return SENSOR_TYPE_LABEL.dexcom_g7;
  }
}

// Nominal ms between live readings, mirroring the app's `SensorType`
// (`readingIntervalSec`: G7 ~5 min, Libre 3 ~1 min).
const READING_INTERVAL_MS: Record<string, number> = {
  dexcom_g7: 5 * 60 * 1000,
  DEXCOM_G7: 5 * 60 * 1000,
  abbott_libre3: 60 * 1000,
  ABBOTT_LIBRE3: 60 * 1000,
};

/** Defaults to the G7's interval, matching `sensorType`'s own fallback. */
export function sensorReadingIntervalMs(data: string): number {
  try {
    const key = JSON.parse(data)?.sensor_type as string | undefined;
    return (key && READING_INTERVAL_MS[key]) || READING_INTERVAL_MS.dexcom_g7;
  } catch {
    return READING_INTERVAL_MS.dexcom_g7;
  }
}

// The runtime maths over these entries lives in `@/lib/sensor`.

export default { current, history };
