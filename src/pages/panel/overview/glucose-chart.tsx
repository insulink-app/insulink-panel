import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  GlucoseEntry,
  GlucosePredictionResponse,
} from "@/api/services/glucose-service";
import { classify, toDisplay, unitLabel } from "@/lib/glucose";
import { useGlucoseHex } from "@/lib/use-glucose-hex";
import { CurrentReading, StatusBadge } from "./glucose-cards";

const PREDICTION_COLOR = "var(--muted-foreground)";

// Themed replacement for the default Recharts tooltip (whose hardcoded white
// box left white-on-white text in dark mode). Recharts injects active/payload.
function ChartTooltip({
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
  // Both series sit in one data array, so the hovered row carries a null for
  // whichever of the two it doesn't belong to.
  const point = payload?.find((entry) => entry.value != null);
  if (!active || !point) {
    return null;
  }
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">
        {format(new Date(label as number), "dd.MM. HH:mm")}
      </div>
      <div className="text-sm font-semibold text-popover-foreground">
        {toDisplay(Number(point.value), unit)} {unitLabel(unit)}
      </div>
      {point.dataKey === "predicted" && (
        <div className="text-xs text-muted-foreground">
          {t("overview.prediction")}
        </div>
      )}
    </div>
  );
}

// The forecast rows, anchored at the latest reading so the dashed line starts
// on the curve. Points at or before that reading are dropped: a stale forecast
// (its refresh failed) would otherwise double back over the real readings.
function predictionRows(
  prediction: GlucosePredictionResponse | undefined,
  latest: GlucoseEntry | undefined,
) {
  const base = prediction?.generated_at;
  if (!prediction?.curve?.length || base == null || !latest) {
    return [];
  }
  return prediction.curve
    .map((point) => ({
      t: base + point.offset_min * 60000,
      predicted: point.mgdl,
    }))
    .filter((row) => row.t > latest.time);
}

/**
 * The latest reading over the glucose history curve, which is coloured by the
 * target zone it runs through.
 */
export function GlucoseChart({
  entries,
  low,
  high,
  unit,
  prediction,
  isLoading,
}: {
  entries: GlucoseEntry[];
  low: number;
  high: number;
  unit?: string;
  prediction?: GlucosePredictionResponse;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const hex = useGlucoseHex();
  const latest = entries[entries.length - 1];

  const history: {
    t: number;
    value?: number;
    predicted?: number;
  }[] = entries.slice(-288).map((entry) => ({
    t: entry.time, // already epoch ms
    value: entry.value,
  }));
  const forecast = predictionRows(prediction, latest);
  if (forecast.length > 0 && history.length > 0) {
    // Anchoring the forecast on the latest reading joins the dashed line to the
    // curve instead of leaving it floating in the future.
    history[history.length - 1].predicted = latest.value;
  }
  const chartData = [...history, ...forecast];

  // Zone colouring is an SVG gradient in objectBoundingBox units: offset 0..1
  // maps to each shape's OWN bounding box, so the thresholds must be expressed
  // relative to that box — not the axis domain (which was the earlier bug).
  //  • stroke (the line) box spans [dataMin, dataMax]
  //  • fill (area to baseline) box spans [dataMax, yMin]
  // Only the readings count here: the box belongs to the history shape, which
  // the forecast's own points never stretch.
  const values = history.map((point) => point.value as number);
  const dataMin = values.length ? Math.min(...values) : low;
  const dataMax = values.length ? Math.max(...values) : high;
  // The axis, unlike the gradient, has to fit the forecast too.
  const forecastValues = forecast.map((point) => point.predicted);
  const yMin = Math.min(low - 20, dataMin, ...forecastValues);
  const yMax = Math.max(high + 20, dataMax, ...forecastValues);
  const clamp = (offset: number) => Math.max(0, Math.min(1, offset));
  const strokeSpan = Math.max(1, dataMax - dataMin);
  const strokeHighOff = clamp((dataMax - high) / strokeSpan);
  const strokeLowOff = clamp((dataMax - low) / strokeSpan);
  const fillSpan = Math.max(1, dataMax - yMin);
  const fillHighOff = clamp((dataMax - high) / fillSpan);
  const fillLowOff = clamp((dataMax - low) / fillSpan);

  return (
    <Card className="h-full">
      <CardHeader>
        <CurrentReading
          entries={entries}
          low={low}
          high={high}
          unit={unit}
          isLoading={isLoading}
        />
        <CardAction className="flex flex-col items-end gap-1.5">
          <StatusBadge entries={entries} low={low} high={high} />
          {latest && !isLoading && (
            <span className="text-xs text-muted-foreground">
              {t("overview.last_updated", {
                time: format(new Date(latest.time), "dd.MM.yyyy HH:mm"),
              })}
            </span>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="py-24 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="zoneStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={strokeHighOff} stopColor={hex.high} />
                  <stop offset={strokeHighOff} stopColor={hex["in-range"]} />
                  <stop offset={strokeLowOff} stopColor={hex["in-range"]} />
                  <stop offset={strokeLowOff} stopColor={hex.low} />
                </linearGradient>
                <linearGradient id="zoneFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset={fillHighOff}
                    stopColor={hex.high}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset={fillHighOff}
                    stopColor={hex["in-range"]}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset={fillLowOff}
                    stopColor={hex["in-range"]}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset={fillLowOff}
                    stopColor={hex.low}
                    stopOpacity={0.15}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(time) => format(new Date(time), "HH:mm")}
                fontSize={12}
              />
              <YAxis domain={[yMin, yMax]} fontSize={12} width={36} />
              <Tooltip
                content={<ChartTooltip unit={unit} />}
                cursor={{ stroke: "var(--border)" }}
                isAnimationActive={false}
              />
              <ReferenceArea
                y1={low}
                y2={high}
                fill={hex["in-range"]}
                fillOpacity={0.08}
              />
              <ReferenceLine
                y={low}
                stroke={hex.low}
                strokeOpacity={0.5}
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={high}
                stroke={hex.high}
                strokeOpacity={0.5}
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#zoneStroke)"
                fill="url(#zoneFill)"
                strokeWidth={2.5}
                isAnimationActive={false}
              />
              {/* The forecast: an Area with no fill, so it stays a plain dashed
                  line the way the app draws it. */}
              <Area
                type="monotone"
                dataKey="predicted"
                stroke={PREDICTION_COLOR}
                strokeWidth={2.5}
                strokeDasharray="6 5"
                strokeOpacity={0.6}
                fill="none"
                connectNulls
                isAnimationActive={false}
              />
              {latest && (
                <ReferenceDot
                  x={latest.time}
                  y={latest.value}
                  r={5}
                  fill={hex[classify(latest.value, low, high)]}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
              {forecast.length > 0 && (
                <ReferenceDot
                  x={forecast[forecast.length - 1].t}
                  y={forecast[forecast.length - 1].predicted}
                  r={3.5}
                  fill={PREDICTION_COLOR}
                  fillOpacity={0.6}
                  stroke="none"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
