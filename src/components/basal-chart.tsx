import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { BASAL_MAX_RATE } from "@/lib/basal";

// Keeps the y-axis sane when every rate is zero.
const MIN_AXIS_TOP = 0.5;

// The 24 hourly basal rates as bars. Without `onSelectHour` it's a bare preview
// (the profile cards); with it, clicking a bar selects that hour for the
// editor's stepper. The app lets you drag a bar — here the stepper does the fine
// tuning.
export function BasalChart({
  rates,
  height = 220,
  selectedHour,
  onSelectHour,
}: {
  rates: number[];
  height?: number;
  selectedHour?: number;
  onSelectHour?: (hour: number) => void;
}) {
  const data = rates.map((rate, hour) => ({ hour, rate }));
  const peak = Math.max(...rates, MIN_AXIS_TOP);
  const interactive = onSelectHour !== undefined;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: interactive ? -20 : 0 }}
      >
        {interactive && (
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            interval={2}
            tickFormatter={(hour: number) => String(hour).padStart(2, "0")}
            fontSize={11}
          />
        )}
        {interactive && (
          <YAxis
            domain={[0, Math.min(Math.ceil(peak * 2) / 2, BASAL_MAX_RATE)]}
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
        )}
        <Bar
          dataKey="rate"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
          onClick={(_, index) => onSelectHour?.(index)}
        >
          {data.map((entry) => (
            <Cell
              key={entry.hour}
              className={interactive ? "cursor-pointer" : undefined}
              fill="var(--primary)"
              fillOpacity={!interactive || entry.hour === selectedHour ? 1 : 0.35}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
