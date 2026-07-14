import { isToday } from "date-fns";

// Aggregation helpers for the overview's "today" tiles. Timestamps are epoch ms
// everywhere, so `at` can be handed straight to `new Date()`.

/** Rows timestamped on the current calendar day. */
export function todayRows<T>(rows: T[], at: (row: T) => number) {
  return rows.filter((row) => isToday(new Date(at(row))));
}

/** Sum of `value` over the rows timestamped today. */
export function sumToday<T>(
  rows: T[],
  at: (row: T) => number,
  value: (row: T) => number,
) {
  return todayRows(rows, at).reduce((sum, row) => sum + (value(row) || 0), 0);
}
