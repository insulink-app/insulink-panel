import client from "../client";

// The server stores settings as one opaque JSON string (full-replace on change).
// We only type the keys the panel edits; everything else is passed through
// untouched so we never drop app-only settings.
export interface UserSettings {
  glucose_unit?: "mgdl" | "mmol";
  glucose_target_low?: number;
  glucose_target_high?: number;
  glucose_urgent_low?: number;
  glucose_urgent_high?: number;
  glucose_low?: number;
  glucose_high?: number;
  notifications?: boolean;
  live_glucose_notification?: boolean;
  sensor_expiry_alert?: boolean;
  connection_lost_alert?: boolean;
  prediction_enabled?: boolean;
  [key: string]: unknown;
}

const find = async (): Promise<UserSettings> => {
  const res = await client.get<{ success: boolean; settings?: string }>({
    url: "/user/settings/find/",
  });
  try {
    return res.settings ? (JSON.parse(res.settings) as UserSettings) : {};
  } catch {
    return {};
  }
};

const change = (settings: UserSettings) =>
  client.post<{ success: boolean }>({
    url: "/user/settings/change/",
    data: { settings: JSON.stringify(settings) },
  });

export default { find, change };
