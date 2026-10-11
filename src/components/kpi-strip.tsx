import type { ReactNode } from "react";

export interface KpiCell {
  label: string;
  value: ReactNode;
  unit?: string;
  /** A dot before the label, for a strip that doubles as a chart legend. */
  dot?: string;
}

/**
 * Key figures standing open on the page, side by side and split by hairlines:
 * no box around them. Two per row on narrow screens.
 */
export function KpiStrip({ cells }: { cells: KpiCell[] }) {
  return (
    <div
      className="grid grid-cols-2 gap-y-4 md:grid-cols-[repeat(var(--kpi-count),minmax(0,1fr))]"
      style={{ "--kpi-count": cells.length } as React.CSSProperties}
    >
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className={`min-w-0 px-6 py-0.5 ${index === 0 ? "pl-0" : "border-l border-divider"} max-md:odd:border-l-0 max-md:odd:pl-0`}
        >
          <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
            {cell.dot && <i className="block size-2 shrink-0 rounded-full" style={{ backgroundColor: cell.dot }} />}
            <span className="truncate">{cell.label}</span>
          </span>
          <span className="mt-1.5 block whitespace-nowrap">
            <b className="text-[28px] font-extrabold tracking-[-0.02em]">{cell.value}</b>
            {cell.unit && <span className="text-sm font-bold text-muted-foreground"> {cell.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
