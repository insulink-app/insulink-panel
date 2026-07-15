// Seconds-per-km → "m:ss /km" (mirrors the app's formatPace); "–" when unknown.
export function formatPace(
  secPerKm: number,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (secPerKm <= 0) {
    return "–";
  }
  const total = Math.round(secPerKm);
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${Math.floor(total / 60)}:${seconds} /${t("body.km")}`;
}

// Spoken-length duration ("12m 30s", "1h 05m") — the detail pages read them at
// rest, unlike the runner's ticking clock.
export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m ${seconds}s`;
}
