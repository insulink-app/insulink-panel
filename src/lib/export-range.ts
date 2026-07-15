// The export's day-range maths. Kept free of any service import so it stays
// pure and runnable outside the browser (see `export-range.check.ts`).
import { endOfDay, parseISO, startOfDay } from "date-fns";

// A day range, both ends inclusive and optional. `yyyy-MM-dd`, straight out of
// the native date inputs; an absent end means unbounded in that direction.
export interface ExportRange {
  from?: string;
  to?: string;
}

// Whole days, both ends inclusive: `to` has to cover its entire day or picking
// one day as from *and* to would select nothing.
export function rangeBounds(range: ExportRange) {
  return {
    from: range.from ? startOfDay(parseISO(range.from)).getTime() : -Infinity,
    to: range.to ? endOfDay(parseISO(range.to)).getTime() : Infinity,
  };
}

export function isRangeValid(range: ExportRange): boolean {
  if (!range.from || !range.to) {
    return true;
  }
  return parseISO(range.from).getTime() <= parseISO(range.to).getTime();
}
