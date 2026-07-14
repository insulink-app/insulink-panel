/** A small labelled figure, used in the detail pages' stat rows. */
export function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-secondary/50 p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-bold" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
