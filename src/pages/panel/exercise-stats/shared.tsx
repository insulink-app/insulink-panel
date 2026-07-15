// The small presentational pieces both the overview and the per-exercise dialog use.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";

export function SummaryTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function StatTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: unknown }[];
  label?: number | string;
  formatLabel: (label: number | string | undefined, row: unknown) => string;
  formatValue: (value: number) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const first = payload[0];
  return (
    <ChartTooltipBox caption={formatLabel(label, first.payload)}>
      <ChartTooltipValue>{formatValue(Number(first.value))}</ChartTooltipValue>
    </ChartTooltipBox>
  );
}
