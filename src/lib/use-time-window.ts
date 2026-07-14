import { useMemo, useState } from "react";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

// Selectable graph spans. `hours`/`days` drive the localized label so no display
// string is concatenated from literals.
export const TIME_RANGES = [
  { ms: 3 * HOUR, hours: 3 },
  { ms: 6 * HOUR, hours: 6 },
  { ms: 12 * HOUR, hours: 12 },
  { ms: DAY, hours: 24 },
  { ms: 3 * DAY, days: 3 },
  { ms: 7 * DAY, days: 7 },
];

export type TimeWindow = ReturnType<typeof useTimeWindow>;

/**
 * Pannable, range-adjustable time window over a series of epoch-ms timestamps.
 * `latest`/`earliest` bound the panning; the window tracks the newest sample
 * until the user pans away from it.
 */
export function useTimeWindow(
  latest: number,
  earliest: number,
  initialRangeMs = 6 * HOUR,
) {
  const [rangeMs, setRangeMs] = useState(initialRangeMs);
  // `null` anchor tracks the latest reading; a number pins the window end.
  const [anchorEnd, setAnchorEnd] = useState<number | null>(null);

  const end = anchorEnd ?? latest;
  const start = end - rangeMs;

  const panBy = (deltaMs: number) => {
    const proposed = end + deltaMs;
    // Snap back to live tracking once panned up to (or past) the latest reading.
    setAnchorEnd(proposed >= latest ? null : proposed);
  };

  return {
    start,
    end,
    rangeMs,
    setRangeMs,
    panBy,
    goLatest: () => setAnchorEnd(null),
    atLatest: anchorEnd == null || end >= latest,
    atEarliest: start <= earliest,
  };
}

/** Filters an ascending-by-time series down to the current window. */
export function useWindowedData<T>(
  items: T[],
  timeOf: (item: T) => number,
  { start, end }: { start: number; end: number },
) {
  return useMemo(
    () => items.filter((item) => timeOf(item) >= start && timeOf(item) <= end),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, start, end],
  );
}
