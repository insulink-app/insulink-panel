import type { GlucoseEntry } from "@/api/services/glucose-service";
import type { Meal } from "@/api/services/nutrition-service";
import type { EventEntry } from "@/api/services/event-service";
import type { SensorHistoryEntry } from "@/api/services/sensor-service";
import type { PumpHistoryEntry } from "@/api/services/pump-service";
import { between, DAY_MS, DEMO_DAYS, HOUR_MS, midnight, MINUTE_MS, NOW } from "./random";

const MEAL_HOURS = [7.5, 12.5, 19];

/** Three meals a day with their carbs, bolus and the glucose at the time. */
export function demoMeals(): Meal[] {
  const meals: Meal[] = [];
  for (let daysAgo = DEMO_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    for (const hour of MEAL_HOURS) {
      const time = midnight(daysAgo) + Math.round((hour + between(-0.5, 0.5)) * 60) * MINUTE_MS;
      if (time > NOW) {
        continue;
      }
      const carbs = Math.round(between(25, 85));
      meals.push({ time, carbs, bolus: Math.round((carbs / 10) * 2) / 2, glucose: Math.round(between(90, 170)) });
    }
  }
  return meals;
}

const SLOT_MS = 5 * MINUTE_MS;
const FIRST_READING = NOW - DEMO_DAYS * DAY_MS;

/**
 * The rise every meal adds per five-minute slot: up for an hour, back down by
 * four. Spread once per meal so the curve stays linear in the window length.
 */
function mealRise(meals: Meal[]): Float64Array {
  const rise = new Float64Array(DEMO_DAYS * (DAY_MS / SLOT_MS) + 1);
  for (const meal of meals) {
    const firstSlot = Math.round((meal.time - FIRST_READING) / SLOT_MS);
    for (let minutes = 0; minutes <= 240; minutes += 5) {
      const slot = firstSlot + minutes / 5;
      if (slot < rise.length) {
        rise[slot] += (meal.carbs ?? 0) * 1.4 * Math.sin((Math.PI * minutes) / 240);
      }
    }
  }
  return rise;
}

/** Five-minute CGM readings over the demo window, shaped by the meals. */
export function demoGlucose(meals: Meal[]): GlucoseEntry[] {
  const rise = mealRise(meals);
  const entries: GlucoseEntry[] = [];
  let drift = 0;
  for (let slot = 0; slot < rise.length; slot += 1) {
    const time = FIRST_READING + slot * SLOT_MS;
    drift = drift * 0.97 + between(-4, 4);
    const dawn = 18 * Math.sin((2 * Math.PI * (time % DAY_MS)) / DAY_MS);
    const value = Math.round(115 + dawn + rise[slot] + drift * 3);
    entries.push({ value: Math.min(Math.max(value, 48), 330), time });
  }
  return entries;
}

/** Lows and highs read off the glucose curve, sensor swaps and signal losses. */
export function demoEvents(glucose: GlucoseEntry[], sensorStarts: number[]): EventEntry[] {
  const events: EventEntry[] = sensorStarts.map((time) => ({ type: "new_sensor", data: "", time }));
  for (let daysAgo = 2; daysAgo < DEMO_DAYS; daysAgo += 9) {
    events.push({ type: "signal_loss", data: "", time: NOW - daysAgo * DAY_MS - 3 * HOUR_MS });
  }
  let lastType = "";
  for (const entry of glucose) {
    const type = entry.value < 70 ? "glucose_low" : entry.value > 250 ? "glucose_high" : "";
    if (type && type !== lastType) {
      events.push({ type, data: String(entry.value), time: entry.time });
    }
    lastType = type;
  }
  return events;
}

const SENSOR_DAYS = 10.5;
const POD_DAYS = 3;

/** Start offsets in days ago, oldest first, the newest `newestDaysAgo` back. */
function changeDays(everyDays: number, newestDaysAgo: number): number[] {
  const count = Math.floor((DEMO_DAYS - newestDaysAgo) / everyDays) + 1;
  return Array.from({ length: count }, (_, index) => newestDaysAgo + (count - 1 - index) * everyDays);
}

/** Dexcom G7s worn back to back, the newest one still running. */
export function demoSensors(): SensorHistoryEntry[] {
  const lifetime = SENSOR_DAYS * DAY_MS;
  return changeDays(SENSOR_DAYS, 3).map((daysAgo, index) => {
    const start = NOW - daysAgo * DAY_MS;
    const data = { sensor_type: "dexcom_g7", sensor_start: start, resolved_key: `DXCM-${index}`, pairing_code: `${4210 + index * 7}` };
    return { id: `sensor-${index}`, data: JSON.stringify(data), registered_at: start + 10 * MINUTE_MS, expires_at: start + lifetime };
  });
}

/** Omnipod DASH pods changed every three days, the last one still running. */
export function demoPods(): PumpHistoryEntry[] {
  return changeDays(POD_DAYS, 1.25).map((daysAgo, index) => {
    const start = NOW - daysAgo * DAY_MS;
    const delivered = Math.round(Math.min(daysAgo, POD_DAYS) * 38);
    const data = {
      pump_type: "omnipod_dash", lot_number: 135792, pod_sequence_number: 4100 + index,
      activated_at: start, expiry_hours: 80, last_seen_at: Math.min(NOW - 4 * MINUTE_MS, start + 72 * HOUR_MS),
      reservoir_units: Math.max(0, 180 - delivered), total_delivered_units: delivered,
    };
    return { id: `pod-${index}`, type: "OMNIPOD_DASH", data: JSON.stringify(data), registered_at: start + 5 * MINUTE_MS, expires_at: start + 80 * HOUR_MS };
  });
}

/** A forecast from the last reading, bending back towards range. */
export function demoPrediction(glucose: GlucoseEntry[], horizon: number) {
  const last = glucose[glucose.length - 1].value;
  const slope = between(-1, 1);
  const curve = [];
  for (let offset = 5; offset <= horizon; offset += 5) {
    curve.push({ offset_min: offset, mgdl: Math.round(last + slope * offset + (120 - last) * (offset / 180)) });
  }
  return { success: true, generated_at: NOW, curve };
}

/** The account settings blob, as the app would have stored it. */
export function demoSettings(): string {
  const rates = Array.from({ length: 24 }, (_, hour) => (hour >= 3 && hour <= 7 ? 1.1 : 0.85));
  const basal = { active: 0, profiles: [{ name: "Standard", rates, peaks: [{ h: 5, w: 1 }], total: 22 }] };
  return JSON.stringify({
    glucose_unit: "mgdl", glucose_target_low: 70, glucose_target_high: 180, glucose_urgent_low: 55,
    glucose_urgent_high: 250, glucose_low: 70, glucose_high: 250, bolus_correction_factor: 40,
    bolus_carb_factor: 10, basal_profiles: JSON.stringify(basal), prediction_enabled: true,
    prediction_band: true, prediction_horizon: 30, "sport.height_cm": 180, "sport.stride_cm": 75,
    "sport.steps_goal": 10000, "sport.distance_goal_m": 7000, "sport.calories_goal": 600,
    "sport.weight_goal_kg": 75, "nutrition.water_goal_ml": 2500, "nutrition.carbs_goal_g": 200,
    "nutrition.protein_goal_g": 120,
  });
}
