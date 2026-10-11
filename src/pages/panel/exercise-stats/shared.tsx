// The small presentational pieces both the overview and the per-exercise dialog use.
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="h-full gap-4 p-6">
      <CardHeading title={title} />
      {children}
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
