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
  if (mgdl < low) return "low";
  if (mgdl > high) return "high";
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
  if (mgdl < Math.min(VERY_LOW, low)) return "very-low";
  if (mgdl < low) return "low";
  if (mgdl > Math.max(VERY_HIGH, high)) return "very-high";
  if (mgdl > high) return "high";
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

export function toDisplay(mgdl: number, unit?: string): string {
  if (unit === "mmol") return (mgdl / 18).toFixed(1);
  return String(Math.round(mgdl));
}

export function unitLabel(unit?: string): string {
  return unit === "mmol" ? "mmol/L" : "mg/dL";
}
