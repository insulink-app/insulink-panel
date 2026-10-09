import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { TimeTick } from "@/components/time-tick";
import { ThresholdGradient } from "@/components/threshold-gradient";
import {
  CHART_MARGIN_TIGHT,
  LINE_STYLE,
  NOW_DOT,
  X_AXIS_STYLE,
  evenTicks,
  thresholdLabel,
} from "@/components/chart-kit";
import { toDisplay, unitLabel } from "@/lib/glucose";
import { useGlucoseHex } from "@/lib/use-glucose-hex";

/** One row of the chart: a reading, a forecast point, or (at the seam) both. */
export interface GlucoseChartRow {
  time: number;
  value?: number;
  predicted?: number;
}

/**
 * Glucose over time as one continuous line, coloured by the band it runs
 * through, over a subtle target band. No y-axis: the target edges carry their
 * number at the right. A forecast continues the line grey and dashed, and the
 * latest reading gets the only dot.
 */
export function GlucoseLineChart({
  rows,
  low,
  high,
  unit,
  start,
  end,
  nowTime,
  height = 260,
  tickFormat = "HH:mm",
  markers,
}: {
  rows: GlucoseChartRow[];
  low: number;
  high: number;
  unit?: string;
  start: number;
  end: number;
  /** The latest reading's time, labelled "now" and marked with the dot. */
  nowTime?: number;
  height?: number;
  tickFormat?: string;
  /** Extra reference lines (a meal's time), drawn under the curve. */
  markers?: ReactNode;
}) {
  const { t } = useTranslation();
  const hex = useGlucoseHex();
  const gradientId = `glucose-${useId().replace(/:/g, "")}`;

  const values = rows.flatMap((row) => [row.value, row.predicted]).filter((value): value is number => value != null);
  const yMin = Math.min(low - 30, ...values);
  const yMax = Math.max(high + 60, ...values);
  const plotTop = CHART_MARGIN_TIGHT.top;
  const plotBottom = height - X_AXIS_STYLE.height;
  const latest = nowTime == null ? undefined : rows.find((row) => row.time === nowTime);
  const ticks = evenTicks(start, nowTime ?? end, 5);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={CHART_MARGIN_TIGHT}>
        <defs>
          <ThresholdGradient
            id={gradientId}
            yMin={yMin}
            yMax={yMax}
            plotTop={plotTop}
            plotBottom={plotBottom}
            bands={[
              { color: hex.high, until: high },
              { color: hex["in-range"], until: low },
              { color: hex.low },
            ]}
          />
        </defs>
        <XAxis
          {...X_AXIS_STYLE}
          dataKey="time"
          type="number"
          domain={[start, end]}
          ticks={ticks}
          interval={0}
          tick={(props) => (
            <TimeTick
              {...props}
              nowTime={nowTime}
              nowLabel={t("common.now")}
              tickFormat={tickFormat}
            />
          )}
        />
        <YAxis hide domain={[yMin, yMax]} />
        <Tooltip
          content={<GlucoseTooltip unit={unit} />}
          cursor={{ stroke: "var(--divider)" }}
          isAnimationActive={false}
        />
        <ReferenceArea y1={low} y2={high} fill="var(--text)" fillOpacity={0.035} />
        <ReferenceLine
          y={high}
          stroke={hex.high}
          strokeOpacity={0.4}
          strokeDasharray="2 5"
          label={thresholdLabel(toDisplay(high, unit))}
        />
        <ReferenceLine
          y={low}
          stroke={hex.low}
          strokeOpacity={0.4}
          strokeDasharray="2 5"
          label={thresholdLabel(toDisplay(low, unit), true)}
        />
        {markers}
        <Line {...LINE_STYLE} dataKey="value" stroke={`url(#${gradientId})`} connectNulls={false} />
        <Line
          {...LINE_STYLE}
          dataKey="predicted"
          stroke="var(--prediction)"
          strokeDasharray="5 5"
          connectNulls
        />
        {latest?.value != null && <ReferenceDot x={latest.time} y={latest.value} {...NOW_DOT} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function GlucoseTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string; dataKey?: string | number }[];
  label?: number;
  unit?: string;
}) {
  const { t } = useTranslation();
  // Readings and forecast share one data array, so the hovered row carries a
  // null for whichever of the two it does not belong to.
  const point = payload?.find((entry) => entry.value != null);
  if (!active || !point) {
    return null;
  }
  return (
    <ChartTooltipBox caption={format(new Date(label as number), "dd.MM. HH:mm")}>
      <ChartTooltipValue>
        {toDisplay(Number(point.value), unit)} {unitLabel(unit)}
      </ChartTooltipValue>
      {point.dataKey === "predicted" && (
        <div className="text-xs text-muted-foreground">{t("overview.prediction")}</div>
      )}
    </ChartTooltipBox>
  );
}
