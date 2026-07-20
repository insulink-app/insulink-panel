// Glucose helpers. Values are mg/dL throughout (the app's storage unit);
// display conversion to mmol/L is a pure /18 when the user prefers it.
export const DEFAULT_TARGET_LOW = 70;
export const DEFAULT_TARGET_HIGH = 180;

export type GlucoseStatus = "low" | "in-range" | "high";

export function classify(
  mgdl: number,
  low = DEFAULT_TARGET_LOW,
  high = DEFAULT_TARGET_HIGH,
): GlucoseStatus {
  if (mgdl < low) {
    return "low";
  }
  if (mgdl > high) {
    return "high";
  }
  return "in-range";
}

export const statusColorVar: Record<GlucoseStatus, string> = {
  low: "var(--glucose-low)",
  "in-range": "var(--glucose-in-range)",
  high: "var(--glucose-high)",
};

// The finer AGP-style bands, for range breakdowns that separate an extreme
// reading from a merely out-of-target one. The target edges come from the
// user's settings; the extremes are the standard 54 / 250 mg/dL cut-offs, held
// inside the target edges in case someone widens their target past them.
export const VERY_LOW = 54;
export const VERY_HIGH = 250;

export type GlucoseBand = "very-low" | "low" | "in-range" | "high" | "very-high";

/** Bands ordered high to low — the order a stacked range bar reads in. */
export const GLUCOSE_BANDS: GlucoseBand[] = [
  "very-high",
  "high",
  "in-range",
  "low",
  "very-low",
];

export function classifyBand(
  mgdl: number,
  low = DEFAULT_TARGET_LOW,
  high = DEFAULT_TARGET_HIGH,
): GlucoseBand {
  if (mgdl < Math.min(VERY_LOW, low)) {
    return "very-low";
  }
  if (mgdl < low) {
    return "low";
  }
  if (mgdl > Math.max(VERY_HIGH, high)) {
    return "very-high";
  }
  if (mgdl > high) {
    return "high";
  }
  return "in-range";
}

/**
 * The band's own edges, in the user's display unit
 * ("70–180 mg/dL", "> 250 mg/dL").
 */
export function bandRange(
  band: GlucoseBand,
  low = DEFAULT_TARGET_LOW,
  high = DEFAULT_TARGET_HIGH,
  unit?: string,
): string {
  const veryLow = Math.min(VERY_LOW, low);
  const veryHigh = Math.max(VERY_HIGH, high);
  const show = (mgdl: number) => toDisplay(mgdl, unit);
  const edges = (): string => {
    switch (band) {
      case "very-low":
        return `< ${show(veryLow)}`;
      case "low":
        return `${show(veryLow)}–${show(low)}`;
      case "in-range":
        return `${show(low)}–${show(high)}`;
      case "high":
        return `${show(high)}–${show(veryHigh)}`;
      case "very-high":
        return `> ${show(veryHigh)}`;
    }
  };
  return `${edges()} ${unitLabel(unit)}`;
}

// The extremes are the low/high hues pushed darker, so the five bands still
// read as one scale in both themes.
export const bandColorVar: Record<GlucoseBand, string> = {
  "very-low": "color-mix(in srgb, var(--glucose-low) 55%, #300)",
  low: "var(--glucose-low)",
  "in-range": "var(--glucose-in-range)",
  high: "var(--glucose-high)",
  "very-high": "color-mix(in srgb, var(--glucose-high) 55%, #530)",
};

// The AGP summary figures the app's "averages" tab shows, computed over a set of
// mg/dL readings. GMI (estimated A1c) and CV are the two clinical headline
// numbers; mean/sd/min/max round out the picture. `null` when there is no data.
export interface GlucoseSummary {
  mean: number;
  gmi: number; // percent
  cv: number; // percent
  sd: number;
  min: number;
  max: number;
  tir: number; // percent in target range
}

export function summaryStats(
  values: number[],
  low = DEFAULT_TARGET_LOW,
  high = DEFAULT_TARGET_HIGH,
): GlucoseSummary | null {
  if (values.length === 0) {
    return null;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  const inRange = values.filter(
    (value) => classify(value, low, high) === "in-range",
  ).length;
  return {
    mean,
    gmi: 3.31 + 0.02392 * mean, // standard CGM GMI formula
    cv: mean === 0 ? 0 : (sd / mean) * 100,
    sd,
    min: Math.min(...values),
    max: Math.max(...values),
    tir: (inRange / values.length) * 100,
  };
}

// day (local midnight, epoch ms) → fraction of readings in target range (0..1),
// for the calendar heatmap. Mirrors the app's DailyTimeInRange.
export function dailyTimeInRange(
  entries: { value: number; time: number }[],
  low = DEFAULT_TARGET_LOW,
  high = DEFAULT_TARGET_HIGH,
): Map<number, number> {
  const total = new Map<number, number>();
  const inRange = new Map<number, number>();
  for (const entry of entries) {
    const date = new Date(entry.time);
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    total.set(day, (total.get(day) ?? 0) + 1);
    if (classify(entry.value, low, high) === "in-range") {
      inRange.set(day, (inRange.get(day) ?? 0) + 1);
    }
  }
  const result = new Map<number, number>();
  for (const [day, count] of total) {
    result.set(day, (inRange.get(day) ?? 0) / count);
  }
  return result;
}

export function toDisplay(mgdl: number, unit?: string): string {
  if (unit === "mmol") {
    return (mgdl / 18).toFixed(1);
  }
  return String(Math.round(mgdl));
}

export function unitLabel(unit?: string): string {
  return unit === "mmol" ? "mmol/L" : "mg/dL";
}

// Shared TIR→colour scale (green ≥70%, amber ≥50%, orange ≥30%, else red),
// matching the app. `undefined` is a data-less day in a span.
export function tirColor(fraction: number | undefined): string {
  if (fraction === undefined) {
    return "color-mix(in srgb, var(--foreground) 6%, transparent)";
  }
  if (fraction >= 0.7) {
    return "var(--glucose-in-range)";
  }
  if (fraction >= 0.5) {
    return "var(--glucose-high)";
  }
  if (fraction >= 0.3) {
    return "color-mix(in srgb, var(--glucose-high) 50%, var(--glucose-low))";
  }
  return "var(--glucose-low)";
}
