// What a pod delivered since it started: the scheduled basal and the boluses.
import type { Meal } from "@/api/services/nutrition-service";

const HOUR = 60 * 60 * 1000;

export interface BolusDose {
  time: number;
  units: number;
}

/**
 * The basal rate in force at each hour boundary between `start` and `end`, as
 * steps for a line. ponytail: the scheduled profile, not what the pod really
 * gave; temporary basals and the loop's adjustments are not in the account
 * data. Upgrade once the app syncs the pod's delivery log.
 */
export function basalSteps(rates: number[], start: number, end: number) {
  const steps: { time: number; rate: number }[] = [];
  for (let time = start; time < end; time = Math.min(end, Math.floor(time / HOUR) * HOUR + HOUR)) {
    steps.push({ time, rate: rates[new Date(time).getHours()] ?? 0 });
  }
  return steps;
}

/** Units of basal delivered over the steps up to `end`. */
export function basalUnits(steps: { time: number; rate: number }[], end: number) {
  return steps.reduce((sum, step, index) => sum + (step.rate * ((steps[index + 1]?.time ?? end) - step.time)) / HOUR, 0);
}

/** The boluses logged with meals while the pod ran. */
export function bolusDoses(meals: Meal[], start: number, end: number): BolusDose[] {
  return meals
    .filter((meal) => (meal.bolus ?? 0) > 0 && meal.time >= start && meal.time <= end)
    .map((meal) => ({ time: meal.time, units: meal.bolus ?? 0 }))
    .sort((left, right) => left.time - right.time);
}

/**
 * Insulin still acting from the boluses at `now`, each decaying linearly over
 * `durationHours`, the way the app's ActiveInsulin counts it.
 */
export function activeInsulin(doses: BolusDose[], durationHours: number, now: number) {
  const duration = durationHours * HOUR;
  return doses.reduce((sum, dose) => {
    const age = now - dose.time;
    return age < 0 || age >= duration ? sum : sum + dose.units * (1 - age / duration);
  }, 0);
}
