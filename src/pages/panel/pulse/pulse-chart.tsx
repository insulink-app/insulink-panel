import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { TimeTick } from "@/components/time-tick";
import { CHART_MARGIN_TIGHT, GRID_STYLE, LINE_STYLE, NOW_DOT, X_AXIS_STYLE, evenTicks, thresholdLabel } from "@/components/chart-kit";
import { DAY, type TimeWindow } from "@/lib/use-time-window";
import type { PulseSample } from "@/api/services/health-service";
import { PULSE_ELEVATED } from "./zones";

/** The heart rate as one violet line, with the elevated edge dashed. */
export function PulseChart({ window, samples }: { window: TimeWindow; samples: PulseSample[] }) {
  const { t } = useTranslation();
  const beats = samples.map((sample) => sample.b);
  const yMin = Math.min(...beats) - 10;
  const yMax = Math.max(PULSE_ELEVATED + 15, ...beats) + 10;
  const latest = samples[samples.length - 1];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={samples} margin={CHART_MARGIN_TIGHT}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          {...X_AXIS_STYLE}
          dataKey="t"
          type="number"
          domain={[window.start, window.end]}
          ticks={evenTicks(window.start, window.atLatest && latest ? latest.t : window.end)}
          interval={0}
          tick={(props) => (
            <TimeTick
              {...props}
              nowTime={window.atLatest ? latest?.t : undefined}
              nowLabel={t("common.now")}
              tickFormat={window.rangeMs > DAY ? "dd.MM." : "HH:mm"}
            />
          )}
        />
        <YAxis hide domain={[yMin, yMax]} />
        <Tooltip
          content={<PulseTooltip unit={t("pulse.bpm")} />}
          cursor={{ stroke: "var(--divider)" }}
          isAnimationActive={false}
        />
        <ReferenceLine
          y={PULSE_ELEVATED}
          stroke="var(--text-muted)"
          strokeOpacity={0.5}
          strokeDasharray="2 5"
          label={thresholdLabel(`${PULSE_ELEVATED} ${t("pulse.bpm")}`)}
        />
        <Line {...LINE_STYLE} dataKey="b" stroke="var(--pulse)" />
        {window.atLatest && latest && <ReferenceDot x={latest.t} y={latest.b} {...NOW_DOT} />}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PulseTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: PulseSample }[];
  unit?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <ChartTooltipBox caption={point ? format(new Date(point.t), "dd.MM. HH:mm") : ""}>
      <ChartTooltipValue>
        {payload[0].value} {unit}
      </ChartTooltipValue>
    </ChartTooltipBox>
  );
}
