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

export function toDisplay(mgdl: number, unit?: string): string {
  if (unit === "mmol") return (mgdl / 18).toFixed(1);
  return String(Math.round(mgdl));
}

export function unitLabel(unit?: string): string {
  return unit === "mmol" ? "mmol/L" : "mg/dL";
}
