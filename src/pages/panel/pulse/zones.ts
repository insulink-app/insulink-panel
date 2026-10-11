// The heart-rate zones the pulse page splits a span into. ponytail: fixed
// edges; the app keeps its own (hr_zone_elevated / hr_zone_high in the
// settings), read those here if the two ever need to agree.
export const PULSE_REST = 60;
export const PULSE_ELEVATED = 100;
export const PULSE_HIGH = 140;

export type PulseZone = "rest" | "normal" | "elevated" | "high";
export const PULSE_ZONES: PulseZone[] = ["rest", "normal", "elevated", "high"];

/** Violet shades from calm to high: the pulse is never red or amber. */
export const ZONE_COLOR: Record<PulseZone, string> = {
  rest: "color-mix(in srgb, var(--pulse) 35%, var(--panel))",
  normal: "color-mix(in srgb, var(--pulse) 60%, var(--panel))",
  elevated: "color-mix(in srgb, var(--pulse) 82%, var(--panel))",
  high: "var(--pulse)",
};

export function zoneOf(bpm: number): PulseZone {
  if (bpm < PULSE_REST) {
    return "rest";
  }
  if (bpm < PULSE_ELEVATED) {
    return "normal";
  }
  return bpm < PULSE_HIGH ? "elevated" : "high";
}
