// Per-day sums for the nutrition pages' week bars.
import { addDays, startOfDay } from "date-fns";

/** `value` summed per day over the last `days` days, today last. */
export function dailyBuckets<T>(rows: T[], at: (row: T) => number, value: (row: T) => number, days = 7, now = new Date()) {
  const first = addDays(startOfDay(now), -(days - 1)).getTime();
  const buckets = Array.from({ length: days }, (_, index) => ({ time: addDays(first, index).getTime(), value: 0 }));
  for (const row of rows) {
    const index = Math.round((startOfDay(new Date(at(row))).getTime() - first) / 86_400_000);
    if (index >= 0 && index < days) {
      buckets[index].value += value(row) || 0;
    }
  }
  return buckets;
}
