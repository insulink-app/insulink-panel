import { format } from "date-fns";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BAR_FILL, BAR_FILL_CURRENT, BAR_STYLE, CHART_MARGIN_TIGHT, X_AXIS_STYLE, thresholdLabel } from "@/components/chart-kit";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { formatNumber } from "@/lib/format";

/**
 * One muted bar per period (a day, a week), the current one in the brand
 * colour, and the average as a dashed line labelled at the right.
 */
export function PeriodBars({
  data,
  height = 180,
  averageLabel,
  formatValue,
}: {
  data: { time: number; value: number }[];
  height?: number;
  averageLabel: (average: string) => string;
  formatValue: (value: number) => string;
}) {
  const average = data.reduce((sum, week) => sum + week.value, 0) / Math.max(1, data.length);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ ...CHART_MARGIN_TIGHT, right: 44 }} barCategoryGap="22%">
        <XAxis {...X_AXIS_STYLE} dataKey="time" tickFormatter={(value) => format(new Date(value), "dd.MM.")} interval="preserveStartEnd" minTickGap={24} />
        <YAxis hide allowDecimals={false} />
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
            <Cell key={week.time} fill={index === data.length - 1 ? BAR_FILL_CURRENT : BAR_FILL} />
          ))}
        </Bar>
        <ReferenceLine
          y={average}
          stroke="var(--text-muted)"
          strokeDasharray="4 4"
          label={{ ...thresholdLabel(averageLabel(formatNumber(average, 1))), position: "right" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
