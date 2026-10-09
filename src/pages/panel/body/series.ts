// The body page's series maths.
import type { MeasurementType } from "@/api/services/sport-service";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export interface MetricSpec {
  type: MeasurementType;
  labelKey: string;
  unitKey: string;
  /** Daily totals draw as bars; weight is a continuous measurement and a line. */
  daily: boolean;
  digits: number;
}

export const METRICS: MetricSpec[] = [
  { type: "WEIGHT", labelKey: "body.weight", unitKey: "body.kg", daily: false, digits: 1 },
  { type: "STEPS", labelKey: "body.steps", unitKey: "body.unit_steps", daily: true, digits: 0 },
  { type: "DISTANCE", labelKey: "body.distance", unitKey: "body.km", daily: true, digits: 2 },
  { type: "CALORIES", labelKey: "body.calories", unitKey: "body.kcal", daily: true, digits: 0 },
];

/**
 * Each point with the mean of the readings in the seven days up to it, so a
 * noisy daily weight reads as its trend. `points` arrive oldest first.
 */
export function withWeeklyAverage(points: { t: number; value: number }[]) {
  let start = 0;
  let sum = 0;
  return points.map((point, index) => {
    sum += point.value;
    while (points[start].t < point.t - WEEK) {
      sum -= points[start].value;
      start++;
    }
    return { ...point, average: sum / (index - start + 1) };
  });
}
