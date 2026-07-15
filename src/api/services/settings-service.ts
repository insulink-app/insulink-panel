import client from "../client";

// The server stores settings as one opaque JSON string (full-replace on change).
// We only type the keys the panel edits; everything else is passed through
// untouched so we never drop app-only settings.
// Keys mirror the app's ProfileSettings.collect() (profile_settings.dart) so the
// panel can edit the same account settings blob. Language/theme are excluded on
// purpose — the app treats them as device-local view prefs (the panel has its
// own selectors in the shell).
export interface UserSettings {
  glucose_unit?: "mgdl" | "mmol";
  glucose_target_low?: number;
  glucose_target_high?: number;
  glucose_urgent_low?: number;
  glucose_urgent_high?: number;
  glucose_low?: number;
  glucose_high?: number;
  bolus_correction_factor?: number;
  bolus_carb_factor?: number;
  // A JSON *string* (the app stores the raw secure-storage blob here) — see
  // `@/lib/basal`. Keep it stringified or the app's pull() writes "[object …]".
  basal_profiles?: string;
  prediction_enabled?: boolean;
  prediction_band?: boolean;
  prediction_horizon?: number;
  notifications?: boolean;
  live_glucose_notification?: boolean;
  connection_lost_alert?: boolean;
  sensor_expiry_alert?: boolean;
  sensor_halftime_alert?: boolean;
  training_detected_alert?: boolean;
  predictive_advisory_alert?: boolean;
  alarm_sound?: boolean;
  silent_mode?: boolean;
  developer?: boolean;
  // Dotted keys match the app's secure-storage keys exactly (SportStore /
  // NutritionStore) so a pull on the app side writes them straight back.
  "sport.height_cm"?: number;
  "sport.stride_cm"?: number;
  "sport.steps_goal"?: number;
  "sport.distance_goal_m"?: number;
  "sport.calories_goal"?: number;
  "sport.weight_goal_kg"?: number;
  "nutrition.water_goal_ml"?: number;
  "nutrition.carbs_goal_g"?: number;
  "nutrition.protein_goal_g"?: number;
  [key: string]: unknown;
}

// The app persists these as strings ("180"), so parsed JSON yields strings.
// Coerce to numbers or `"180" + 20` silently concatenates to "18020" downstream.
const NUMERIC_KEYS = [
  "glucose_target_low",
  "glucose_target_high",
  "glucose_urgent_low",
  "glucose_urgent_high",
  "glucose_low",
  "glucose_high",
  "bolus_correction_factor",
  "bolus_carb_factor",
  "prediction_horizon",
  "sport.height_cm",
  "sport.stride_cm",
  "sport.steps_goal",
  "sport.distance_goal_m",
  "sport.calories_goal",
  "sport.weight_goal_kg",
  "nutrition.water_goal_ml",
  "nutrition.carbs_goal_g",
  "nutrition.protein_goal_g",
] as const;

// Stored as strings too ("true"), so `settings.prediction_enabled === true` is
// false for an enabled forecast until these are coerced. Writing real booleans
// back is safe: the app's pull() stringifies every value it reads.
const BOOLEAN_KEYS = [
  "prediction_enabled",
  "prediction_band",
  "notifications",
  "live_glucose_notification",
  "connection_lost_alert",
  "sensor_expiry_alert",
  "sensor_halftime_alert",
  "training_detected_alert",
  "predictive_advisory_alert",
  "alarm_sound",
  "silent_mode",
  "developer",
] as const;

const find = async (): Promise<UserSettings> => {
  const res = await client.get<{ success: boolean; settings?: string }>({
    url: "/user/settings/find/",
  });
  try {
    const settings = res.settings
      ? (JSON.parse(res.settings) as UserSettings)
      : {};
    for (const key of NUMERIC_KEYS) {
      if (settings[key] != null) settings[key] = Number(settings[key]);
    }
    for (const key of BOOLEAN_KEYS) {
      if (settings[key] != null) settings[key] = String(settings[key]) === "true";
    }
    return settings;
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
