/** A small labelled figure, used in the detail pages' stat rows. */
export function StatTile({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color?: string;
  /** Explains the figure on hover, for the ones a label can't carry alone. */
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-secondary/50 p-4" title={hint}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-bold" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
