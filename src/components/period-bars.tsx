import { format } from "date-fns";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BAR_FILL, BAR_FILL_CURRENT, BAR_STYLE, CHART_MARGIN_TIGHT, X_AXIS_STYLE, thresholdLabel } from "@/components/chart-kit";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { formatNumber } from "@/lib/format";

/**
 * One muted bar per period (a day, a week), the current one in the brand
 * colour, and the average as a dashed line labelled at the right. `line`
 * replaces the average with another reference (a goal); `color` tints the bars.
 */
export function PeriodBars({
  data,
  height = 180,
  averageLabel,
  formatValue,
  line,
  color,
  tickLabel = (time) => format(new Date(time), "dd.MM."),
}: {
  data: { time: number; value: number }[];
  height?: number;
  averageLabel: (average: string) => string;
  formatValue: (value: number) => string;
  line?: { value: number; label: string };
  color?: string;
  tickLabel?: (time: number) => string;
}) {
  const average = data.reduce((sum, week) => sum + week.value, 0) / Math.max(1, data.length);
  const reference = line ?? { value: average, label: averageLabel(formatNumber(average, 1)) };
  const fill = color ? `color-mix(in srgb, ${color} 45%, transparent)` : BAR_FILL;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ ...CHART_MARGIN_TIGHT, right: 44 }} barCategoryGap="22%">
        <XAxis {...X_AXIS_STYLE} dataKey="time" tickFormatter={tickLabel} interval="preserveStartEnd" minTickGap={24} />
        <YAxis hide allowDecimals={false} domain={[0, (max: number) => Math.max(max, reference.value * 1.1)]} />
        <Tooltip
          isAnimationActive={false}
          cursor={{ fill: "var(--raised)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <ChartTooltipBox caption={format(new Date(label as number), "dd.MM.yyyy")}>
                <ChartTooltipValue>{formatValue(Number(payload[0].value))}</ChartTooltipValue>
              </ChartTooltipBox>
            ) : null
          }
        />
        <Bar {...BAR_STYLE} dataKey="value">
          {data.map((week, index) => (
            <Cell key={week.time} fill={index === data.length - 1 ? (color ?? BAR_FILL_CURRENT) : fill} />
          ))}
        </Bar>
        <ReferenceLine
          y={reference.value}
          stroke="var(--text-muted)"
          strokeDasharray="4 4"
          label={{ ...thresholdLabel(reference.label), position: "right" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
