// The sleep page's model: stage colours and lanes, and minutes as "7 h 59".
import type { HealthDay, SleepSegment } from "@/api/services/health-service";

// SleepStage enum order from the app: index → key. `tl` segments carry the index.
export const STAGE_KEYS = ["deep", "rem", "light", "awake", "restless"] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

/** The four phases the page shows, in the order the strip lists them. */
export const PHASES = ["deep", "rem", "light", "awake"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_COLOR: Record<Phase, string> = {
  deep: "var(--sleep-deep)",
  rem: "var(--sleep-rem)",
  light: "var(--sleep-light)",
  awake: "var(--sleep-awake)",
};

/** Hypnogram lanes, top to bottom: shallowest to deepest. */
export const LANES: Phase[] = ["awake", "rem", "light", "deep"];

/** A segment's lane; restless sleep sits with the awake phases. */
export function laneOf(segment: SleepSegment): Phase {
  const key = STAGE_KEYS[segment.s] ?? "light";
  return key === "restless" ? "awake" : key;
}

export function phaseMinutes(night: HealthDay): Record<Phase, number> {
  return {
    deep: night.stages?.deep ?? 0,
    rem: night.stages?.rem ?? 0,
    light: night.stages?.light ?? 0,
    awake: (night.stages?.awake ?? 0) + (night.stages?.restless ?? 0),
  };
}

/** Minutes as hours and minutes ("7 h 59"); under an hour just the minutes. */
export function hoursMinutes(minutes: number | undefined | null): { hours: number; minutes: number } | null {
  if (minutes == null) {
    return null;
  }
  return { hours: Math.floor(minutes / 60), minutes: Math.round(minutes % 60) };
}

export function formatHoursMinutes(minutes: number | undefined | null, hourUnit: string): string {
  const parts = hoursMinutes(minutes);
  if (!parts) {
    return "–";
  }
  return parts.hours > 0 ? `${parts.hours} ${hourUnit} ${parts.minutes}` : String(parts.minutes);
}
