import client from "../client";
import { t } from "@/locales/i18n";

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

// Map the `sensor_type` wireKey from the data blob to a readable label.
export const SENSOR_TYPE_LABEL: Record<string, string> = {
  dexcom_g7: "Dexcom G7",
  abbott_libre3: "Abbott Libre 3",
};

export function sensorType(data: string): string {
  try {
    const key = JSON.parse(data)?.sensor_type as string | undefined;
    return (key && SENSOR_TYPE_LABEL[key]) || t("sensor.unknown");
  } catch {
    return t("sensor.unknown");
  }
}

export default { current, history };
