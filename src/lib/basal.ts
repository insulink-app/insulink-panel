// Basal-rate profiles for the Omnipod — the panel-side port of the app's
// basal_profile.dart / profile_basal_state.dart. Persisted inside the account
// settings blob under `basal_profiles` as a JSON *string* (the app's
// ProfileSettings.collect() stores the raw secure-storage value there), so the
// app reads back exactly what the panel writes.

/// A single maximum of a generated basal curve: a bump centred on `h` (0..24,
/// wrapping at midnight) with a relative weight `w`.
export interface BasalPeak {
  h: number;
  w: number;
}

export interface BasalProfile {
  name: string;
  rates: number[]; // 24 values, index = hour of day
  peaks: BasalPeak[];
  total: number; // the generator's target daily total (U/day)
}

export interface BasalProfiles {
  active: number;
  profiles: BasalProfile[];
}

/// Omnipod delivers basal in 0.05 U/h increments; every rate snaps to this.
export const BASAL_STEP = 0.05;
export const BASAL_MAX_RATE = 5;

/// Gaussian half-width (hours) of each generated peak.
const PEAK_WIDTH = 3;

/// Relative floor so a generated curve is never flat-zero between peaks.
const BASELINE = 0.5;

export const PEAK_MIN_WEIGHT = 0.2;
export const PEAK_MAX_WEIGHT = 2;

export function snapRate(rate: number): number {
  const snapped = Math.round(rate / BASAL_STEP) * BASAL_STEP;
  return Math.min(Math.max(snapped, 0), BASAL_MAX_RATE);
}

/// Total daily basal insulin (U/day) actually delivered by `rates`.
export function deliveredTotal(profile: BasalProfile): number {
  return profile.rates.reduce((sum, rate) => sum + rate, 0);
}

export function initialProfile(name: string): BasalProfile {
  return {
    name,
    rates: Array<number>(24).fill(1),
    peaks: [{ h: 5, w: 1 }],
    total: 24,
  };
}

function circularDistance(hour: number, peakHour: number): number {
  const raw = Math.abs(hour - peakHour) % 24;
  return Math.min(raw, 24 - raw);
}

function rawAt(hour: number, peaks: BasalPeak[]): number {
  let value = BASELINE;
  for (const peak of peaks) {
    const distance = circularDistance(hour, peak.h);
    value += peak.w * Math.exp(-(distance * distance) / (2 * PEAK_WIDTH * PEAK_WIDTH));
  }
  return value;
}

/// Rebuilds the hourly rates from `peaks` scaled to `total`. Peaks wrap around
/// midnight so an early-morning bump also lifts the last hours. Rounding to
/// BASAL_STEP leaves a small drift from the exact total.
export function regenerate(profile: BasalProfile): BasalProfile {
  const raw = Array.from({ length: 24 }, (_, hour) => rawAt(hour + 0.5, profile.peaks));
  const sum = raw.reduce((accumulated, value) => accumulated + value, 0);
  if (sum <= 0 || profile.total <= 0) {
    return { ...profile, rates: Array<number>(24).fill(0) };
  }
  return { ...profile, rates: raw.map((value) => snapRate((value / sum) * profile.total)) };
}

function parseProfile(raw: unknown): BasalProfile | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const candidate = raw as Partial<BasalProfile>;
  if (!Array.isArray(candidate.rates) || candidate.rates.length !== 24) {
    return null;
  }
  return {
    name: typeof candidate.name === "string" ? candidate.name : "Standard",
    rates: candidate.rates.map((rate) => Number(rate) || 0),
    peaks: Array.isArray(candidate.peaks)
      ? candidate.peaks.map((peak) => ({ h: Number(peak.h) || 0, w: Number(peak.w) || 1 }))
      : [],
    total: Number(candidate.total) || 24,
  };
}

/// Decodes the `basal_profiles` settings value. Anything unreadable falls back
/// to a fresh default profile rather than blocking the editor.
export function decodeProfiles(raw: unknown): BasalProfiles {
  const fresh: BasalProfiles = { active: 0, profiles: [initialProfile("Standard")] };
  if (typeof raw !== "string" || raw.trim() === "") {
    return fresh;
  }
  try {
    const parsed = JSON.parse(raw) as { active?: unknown; profiles?: unknown };
    const profiles = Array.isArray(parsed.profiles)
      ? parsed.profiles.map(parseProfile).filter((profile): profile is BasalProfile => profile !== null)
      : [];
    if (profiles.length === 0) {
      return fresh;
    }
    const active = Number(parsed.active) || 0;
    return { active: Math.min(Math.max(active, 0), profiles.length - 1), profiles };
  } catch {
    return fresh;
  }
}

/// The app stores this as a string inside the settings blob — keep it a string.
export function encodeProfiles(state: BasalProfiles): string {
  return JSON.stringify(state);
}
