import type { ReactNode } from "react";

/**
 * A status as a 28 px chip: a dot and the label in the status colour on a 14 %
 * tint of it. Only for glucose ranges and device or connection status.
 */
export function StatusChip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <i className="block size-[7px] rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {children}
    </span>
  );
}
