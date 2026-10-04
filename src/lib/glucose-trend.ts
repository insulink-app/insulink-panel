// The glucose trend (mg/dL per minute) for the arrow beside a reading.
//
// The account stores no trend, only values, so the panel has to estimate one.
// Two readings five minutes apart move with every bit of sensor noise and flip
// the arrow between flat and steep from one reading to the next. The app shows
// the sensor's own trend, which the sensor smooths. The closest the panel gets
// is the least-squares slope through every reading of the last 15 minutes: one
// outlier then tilts the line instead of deciding it.
import type { GlucoseEntry } from "@/api/services/glucose-service";

const TREND_WINDOW_MINUTES = 15;
const MIN_SPAN_MINUTES = 8;

export function trendPerMinute(entries: GlucoseEntry[]): number | undefined {
  const sorted = [...entries].sort((left, right) => left.time - right.time);
  const latest = sorted[sorted.length - 1];
  if (!latest) {
    return undefined;
  }
  const recent = sorted.filter(
    (entry) => latest.time - entry.time <= TREND_WINDOW_MINUTES * 60_000,
  );
  const spanMinutes = (latest.time - recent[0].time) / 60_000;
  if (recent.length < 3 || spanMinutes < MIN_SPAN_MINUTES) {
    return undefined;
  }
  const minutes = recent.map((entry) => (entry.time - latest.time) / 60_000);
  const meanMinute = minutes.reduce((sum, value) => sum + value, 0) / minutes.length;
  const meanValue = recent.reduce((sum, entry) => sum + entry.value, 0) / recent.length;
  let covariance = 0;
  let variance = 0;
  recent.forEach((entry, index) => {
    covariance += (minutes[index] - meanMinute) * (entry.value - meanValue);
    variance += (minutes[index] - meanMinute) ** 2;
  });
  return variance === 0 ? undefined : covariance / variance;
}

export type TrendDirection = "up" | "up_right" | "flat" | "down_right" | "down";

// The app's five buckets (glucose_trend_icon.dart), so both screens put the
// same arrow on the same rate.
export function trendDirection(perMin: number): TrendDirection {
  if (perMin >= 2) {
    return "up";
  }
  if (perMin >= 1) {
    return "up_right";
  }
  if (perMin > -1) {
    return "flat";
  }
  return perMin > -2 ? "down_right" : "down";
}
