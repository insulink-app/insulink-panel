import type { HealthDay, PulseSample, SleepSegment } from "@/api/services/health-service";
import type { Drink, FoodProduct } from "@/api/services/nutrition-service";
import { between, DAY_MS, DEMO_DAYS, HOUR_MS, midnight, MINUTE_MS, NOW } from "./random";

const dateKey = (time: number) => {
  const day = new Date(time);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
};

/** A night from 23:00 cycling light, deep, light, REM, with a short wake-up. */
function hypnogram(bedtime: number): SleepSegment[] {
  const segments: SleepSegment[] = [];
  let cursor = bedtime;
  const cycle = [2, 0, 2, 1];
  for (let step = 0; step < 20; step += 1) {
    const stage = step === 9 ? 3 : cycle[step % cycle.length];
    const minutes = stage === 3 ? 6 : Math.round(between(15, 35));
    segments.push({ s: stage, a: cursor, b: cursor + minutes * MINUTE_MS });
    cursor += minutes * MINUTE_MS;
  }
  return segments;
}

/** One Fitbit day per date: resting pulse, SpO2, breathing rate and the night. */
export function demoHealthDays(): HealthDay[] {
  return Array.from({ length: DEMO_DAYS }, (_, index) => {
    const timeline = hypnogram(midnight(index + 1) + 23 * HOUR_MS);
    const stages = { deep: 0, rem: 0, light: 0, awake: 0 };
    const stageNames = ["deep", "rem", "light", "awake"] as const;
    for (const segment of timeline) {
      stages[stageNames[segment.s]] += (segment.b - segment.a) / MINUTE_MS;
    }
    const sleep = stages.deep + stages.rem + stages.light;
    return {
      d: dateKey(midnight(index)), rhr: Math.round(between(54, 62)), sleep, spo2: Math.round(between(95, 99)),
      rr: Math.round(between(13, 16) * 10) / 10, stages, tl: timeline,
    };
  });
}

/** Pulse every five minutes over the last two weeks, higher while awake. */
export function demoPulse(): PulseSample[] {
  const samples: PulseSample[] = [];
  for (let time = NOW - 14 * DAY_MS; time <= NOW; time += 5 * MINUTE_MS) {
    const hour = new Date(time).getHours();
    const base = hour < 7 || hour >= 23 ? 55 : 72;
    samples.push({ t: time, b: Math.round(base + between(-6, 14)) });
  }
  return samples;
}

/** A few glasses and a bottle of water every day. */
export function demoDrinks(): Drink[] {
  const drinks: Drink[] = [];
  for (let daysAgo = DEMO_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    for (const hour of [8, 11, 14, 17, 20]) {
      const at = midnight(daysAgo) + hour * HOUR_MS;
      if (at <= NOW) {
        drinks.push({ at, ml: hour === 14 ? 500 : 250, kind: hour === 14 ? "small_bottle" : "glass" });
      }
    }
  }
  return drinks;
}

export const DEMO_PRODUCTS: FoodProduct[] = [
  { barcode: "4000000000001", name: "Oatmeal", brand: "Demo", unit: "g", serving: 50, carbs: 59, fat: 7, protein: 13, kcal: 370 },
  { barcode: "4000000000002", name: "Wholegrain bread", brand: "Demo", unit: "g", serving: 45, carbs: 41, fat: 3, protein: 9, kcal: 230 },
  { barcode: "4000000000003", name: "Orange juice", brand: "Demo", unit: "ml", serving: 250, carbs: 9, fat: 0, protein: 1, kcal: 43 },
  { barcode: "4000000000004", name: "Greek yogurt", brand: "Demo", unit: "g", serving: 150, carbs: 4, fat: 10, protein: 9, kcal: 133 },
];
