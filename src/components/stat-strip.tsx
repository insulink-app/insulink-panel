import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatCell {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Tints the value, for a figure that carries a status (a glucose reading). */
  color?: string;
  /** Explains the figure on hover, for the ones a label cannot carry alone. */
  hint?: string;
}

/**
 * Figures side by side in one sunken block, separated by hairlines: the only
 * box the panel allows inside a card. Wraps to two columns on narrow screens.
 */
export function StatStrip({ cells, loading }: { cells: StatCell[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[18px] bg-ground sm:flex">
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          title={cell.hint}
          className={`min-w-0 flex-1 px-4 py-3.5 ${index > 0 ? "border-divider sm:border-l" : ""} ${index % 2 === 1 ? "border-l border-divider" : ""} ${index > 1 ? "border-t border-divider sm:border-t-0" : ""}`}
        >
          <span className="block truncate text-[13px] text-muted-foreground">{cell.label}</span>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-16" />
          ) : (
            <span className="mt-1 block truncate">
              <b className="text-[22px] font-extrabold" style={cell.color ? { color: cell.color } : undefined}>
                {cell.value}
              </b>
              {cell.unit && <span className="text-[13px] text-muted-foreground"> {cell.unit}</span>}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
