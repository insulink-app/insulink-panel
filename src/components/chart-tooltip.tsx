// The hover box every chart on the panel shares, so a reading looks the same
// whichever page it is read on — instead of Recharts' default box.
// Only the shell lives here: each chart formats its own caption and rows, since
// what a value means (a unit, a delta, a second series) is the chart's business.
import { cn } from "@/lib/utils";

export function ChartTooltipBox({
  caption,
  children,
}: {
  caption: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-divider bg-popover px-3 py-2">
      <div className="text-xs text-muted-foreground">{caption}</div>
      {children}
    </div>
  );
}

export function ChartTooltipValue({
  color,
  className,
  children,
}: {
  /** Stains the row to match its series; falls back to the popover foreground. */
  color?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("text-sm font-semibold text-popover-foreground", className)}
      style={color ? { color } : undefined}
    >
      {children}
    </div>
  );
}
