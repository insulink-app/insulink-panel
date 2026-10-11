// The body page's series maths.
import type { TFunction } from "i18next";
import type { KpiCell } from "@/components/kpi-strip";
import { formatNumber } from "@/lib/format";
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

/** Above this many daily totals, the bars are drawn per week instead. */
const MAX_DAILY_BARS = 90;

/**
 * Daily totals as bars: one per day while they fit, else one per week holding
 * that week's mean per day, so a year reads as a calm row of bars instead of
 * hundreds of hairlines. `points` arrive oldest first.
 */
export function barPoints(points: { t: number; value: number }[]) {
  if (points.length <= MAX_DAILY_BARS) {
    return points;
  }
  const weeks = new Map<number, { t: number; sum: number; count: number }>();
  for (const point of points) {
    const week = Math.floor(point.t / WEEK);
    const bucket = weeks.get(week) ?? { t: point.t, sum: 0, count: 0 };
    bucket.sum += point.value;
    bucket.count++;
    weeks.set(week, bucket);
  }
  return [...weeks.values()].map((bucket) => ({ t: bucket.t, value: bucket.sum / bucket.count }));
}

/** Average, maximum (or total), minimum and count for the open KPI strip. */
export function keyFigureCells(values: number[], metric: MetricSpec, unit: string, t: TFunction): KpiCell[] {
  const sum = values.reduce((total, value) => total + value, 0);
  const show = (value: number) => (values.length ? formatNumber(value, metric.digits) : "–");
  return [
    { label: t("body.average"), value: show(sum / Math.max(1, values.length)), unit },
    metric.daily
      ? { label: t("body.total"), value: show(sum), unit }
      : { label: t("body.maximum"), value: show(Math.max(...values)), unit },
    { label: t("body.minimum"), value: show(Math.min(...values)), unit },
    { label: t("body.entries"), value: formatNumber(values.length) },
  ];
}
