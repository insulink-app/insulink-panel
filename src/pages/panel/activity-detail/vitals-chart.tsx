import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import {
  CartesianGrid,
  getRelativeCoordinate,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  useXAxisInverseScale,
  type InverseScaleFunction,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";

const GLUCOSE_COLOR = "#6366f1";
const PULSE_COLOR = "#e0533d";
const SPEED_COLOR = "#16a34a";

type VitalsRow = {
  t: number;
  glucose?: number;
  pulse?: number;
  speed?: number;
  // Each series' reading at this row's time — tooltip only, never drawn.
  glucoseAt?: number;
  pulseAt?: number;
  speedAt?: number;
};

// Glucose (mg/dL, left axis) and pulse (bpm, right axis) over the activity's
// window. The two series carry different timestamps, so they're merged into one
// sorted series and bridged with connectNulls.
// Memoised: hovering it updates the map marker via state on the page above, and
// without this the chart would rebuild its merged series on every mouse move.
export const VitalsChart = memo(function VitalsChart({
  window,
  glucose,
  pulse,
  speed,
  onHover,
}: {
  window: { start: number; end: number };
  glucose: { t: number; glucose: number }[];
  pulse: { t: number; pulse: number }[];
  speed: { t: number; speed: number }[];
  onHover: (time: number | null) => void;
}) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  // The hovered point reads as a neutral marker, not the series colour: white on
  // dark, black on light, ringed by its opposite so it stays visible.
  const activeDot = {
    r: 4,
    fill: resolvedTheme === "dark" ? "#ffffff" : "#000000",
    stroke: resolvedTheme === "dark" ? "#000000" : "#ffffff",
    strokeWidth: 1.5,
  };
  // The axis hugs the activity itself — no padding — so glucose, pulse and speed
  // all fill the same span instead of pulse/speed looking cut off inside a wider,
  // mostly-empty window.
  const from = window.start;
  const to = window.end;
  // The cursor pixel, not `activeLabel`: the label is the *nearest data point's*
  // timestamp, so reporting it makes the map marker hop from reading to reading.
  // The inverse scale turns the pixel back into an exact time, but it is only
  // reachable from a hook inside the chart — `ScaleProbe` parks it here so the
  // handler can read it without holding the cursor in state and re-rendering
  // the whole chart on every mouse move.
  const inverseScaleRef = useRef<InverseScaleFunction | null>(null);

  const data = useMemo(
    () => buildRows(glucose, pulse, speed, from, to),
    [glucose, pulse, speed, from, to],
  );
  const ticks = useMemo(() => timeTicks(from, to), [from, to]);

  const hasGlucose = data.some((point) => point.glucose != null);
  const hasPulse = data.some((point) => point.pulse != null);
  const hasSpeed = data.some((point) => point.speed != null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("activity.vitals")}</CardTitle>
        <div className="flex gap-4 text-xs">
          {hasGlucose && <Legend color={GLUCOSE_COLOR} label={t("activity.glucose")} />}
          {hasPulse && <Legend color={PULSE_COLOR} label={t("activity.pulse")} />}
          {hasSpeed && <Legend color={SPEED_COLOR} label={t("activity.speed")} />}
        </div>
      </CardHeader>
      <CardContent>
        {!hasGlucose && !hasPulse && !hasSpeed ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("activity.no_vitals")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              onMouseMove={(_, event) => {
                const inverseScale = inverseScaleRef.current;
                if (inverseScale) {
                  onHover(Number(inverseScale(getRelativeCoordinate(event).relativeX)));
                }
              }}
              onMouseLeave={() => onHover(null)}
            >
              <ScaleProbe scaleRef={inverseScaleRef} />
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[from, to]}
                ticks={ticks}
                tickFormatter={(value) => format(new Date(value), "HH:mm")}
                fontSize={12}
              />
              <YAxis
                yAxisId="glucose"
                fontSize={12}
                width={40}
                domain={["dataMin - 10", "dataMax + 10"]}
                stroke={GLUCOSE_COLOR}
              />
              <YAxis
                yAxisId="pulse"
                orientation="right"
                fontSize={12}
                width={36}
                domain={["dataMin - 5", "dataMax + 5"]}
                stroke={PULSE_COLOR}
              />
              {/* Speed scales to its own range but shows no axis — a third visible
                  axis would crowd the plot. */}
              <YAxis yAxisId="speed" hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip
                content={
                  <VitalsTooltip
                    glucoseLabel={t("activity.glucose")}
                    pulseLabel={t("activity.pulse")}
                    speedLabel={t("activity.speed")}
                    glucoseUnit={t("glucose.mgdl")}
                    pulseUnit={t("pulse.bpm")}
                    speedUnit={t("activity.kmh")}
                  />
                }
                isAnimationActive={false}
              />
              <Line
                yAxisId="glucose"
                type="monotone"
                dataKey="glucose"
                stroke={GLUCOSE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={activeDot}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId="pulse"
                type="monotone"
                dataKey="pulse"
                stroke={PULSE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={activeDot}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId="speed"
                type="monotone"
                dataKey="speed"
                stroke={SPEED_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={activeDot}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});

// Merge the two series into one time-sorted set of rows. A row only ever holds
// the value of the series it came from, so the hovered row would show just one
// of the two. Give every row both series' value at its time — under
// tooltip-only keys, so the drawn lines keep their own (sparser) points instead
// of gaining stair steps.
// Copies, because the rows are the caller's memoised objects, not ours.
function buildRows(
  glucose: { t: number; glucose: number }[],
  pulse: { t: number; pulse: number }[],
  speed: { t: number; speed: number }[],
  from: number,
  to: number,
): VitalsRow[] {
  const inWindow = (time: number) => time >= from && time <= to;
  const byTime = (left: { t: number }, right: { t: number }) => left.t - right.t;
  const glucoseIn = glucose.filter((point) => inWindow(point.t)).sort(byTime);
  const pulseIn = pulse.filter((point) => inWindow(point.t)).sort(byTime);
  const speedIn = speed.filter((point) => inWindow(point.t)).sort(byTime);
  const merged = [...glucoseIn, ...pulseIn, ...speedIn].sort(byTime) as VitalsRow[];
  const glucoseAt = seriesSampler(glucoseIn.map((point) => ({ t: point.t, value: point.glucose })));
  const pulseAt = seriesSampler(pulseIn.map((point) => ({ t: point.t, value: point.pulse })));
  const speedAt = seriesSampler(speedIn.map((point) => ({ t: point.t, value: point.speed })));
  return merged.map((row) => ({
    ...row,
    glucoseAt: glucoseAt(row.t),
    pulseAt: pulseAt(row.t),
    speedAt: speedAt(row.t),
  }));
}

const TICK_STEPS_MS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720].map((minutes) => minutes * 60000);

// Recharts derives its ticks from the data points, and the pulse samples every
// few seconds — so the axis came out as a minute-by-minute smear. Lay the ticks
// on round times across the window instead, at the coarsest step that still
// leaves ~`target` of them.
// ponytail: steps are aligned against epoch (UTC), so a step above an hour can
// land off-hour in a half-hour timezone. Activity windows never get that long.
function timeTicks(from: number, to: number, target = 6) {
  const step =
    TICK_STEPS_MS.find((candidate) => (to - from) / candidate <= target) ??
    TICK_STEPS_MS[TICK_STEPS_MS.length - 1];
  const ticks: number[] = [];
  for (let tick = Math.ceil(from / step) * step; tick <= to; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

// How far the tooltip will reach for a reading. Past this the nearest sample is
// a guess rather than a measurement, so the tooltip says nothing instead.
const MAX_TOOLTIP_GAP_MS = 5 * 60000;

// A series' value at a given time, read off the line between the two samples
// that straddle it — the same value the chart draws there. Nearest-sample was
// not enough: the pulse is the sparser series, so the tooltip kept reporting a
// reading minutes away from the cursor while the line showed the slope.
// Times are asked in ascending order, so one forward cursor covers the pass.
function seriesSampler(samples: { t: number; value: number }[]) {
  let cursor = 0;
  return (time: number) => {
    while (cursor + 1 < samples.length && samples[cursor + 1].t <= time) {
      cursor += 1;
    }
    const left = samples[cursor];
    if (!left) {
      return undefined;
    }
    const right = samples[cursor + 1];
    if (left.t <= time && right && right.t - left.t <= MAX_TOOLTIP_GAP_MS) {
      const ratio = (time - left.t) / (right.t - left.t);
      return left.value + (right.value - left.value) * ratio;
    }
    // Outside a straddling pair (or across a gap too wide to read a slope from),
    // the closest sample — but only while it is close enough to still mean
    // something at this time.
    const nearest = right && Math.abs(right.t - time) < Math.abs(left.t - time) ? right : left;
    return Math.abs(nearest.t - time) <= MAX_TOOLTIP_GAP_MS ? nearest.value : undefined;
  };
}

// Hands the x-axis inverse scale to the chart's mouse handler. The hook only
// works inside the chart, so this rides along as a child and renders nothing.
function ScaleProbe({ scaleRef }: { scaleRef: RefObject<InverseScaleFunction | null> }) {
  const inverseScale = useXAxisInverseScale();
  useEffect(() => {
    scaleRef.current = inverseScale ?? null;
  }, [inverseScale, scaleRef]);
  return null;
}

function VitalsTooltip({
  active,
  payload,
  label,
  glucoseLabel,
  pulseLabel,
  speedLabel,
  glucoseUnit,
  pulseUnit,
  speedUnit,
}: {
  active?: boolean;
  payload?: { payload?: VitalsRow }[];
  label?: number;
  glucoseLabel: string;
  pulseLabel: string;
  speedLabel: string;
  glucoseUnit: string;
  pulseUnit: string;
  speedUnit: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  // The source row, not the per-series entries: those only carry the one value
  // the hovered row was built from.
  const row = payload[0]?.payload;
  const glucose = row?.glucoseAt;
  const pulse = row?.pulseAt;
  const speed = row?.speedAt;
  return (
    <ChartTooltipBox caption={format(new Date(label as number), "dd.MM. HH:mm")}>
      {glucose != null && (
        <ChartTooltipValue color={GLUCOSE_COLOR}>
          {glucoseLabel}: {Math.round(glucose)} {glucoseUnit}
        </ChartTooltipValue>
      )}
      {pulse != null && (
        <ChartTooltipValue color={PULSE_COLOR}>
          {pulseLabel}: {Math.round(pulse)} {pulseUnit}
        </ChartTooltipValue>
      )}
      {speed != null && (
        <ChartTooltipValue color={SPEED_COLOR}>
          {speedLabel}: {speed.toFixed(1)} {speedUnit}
        </ChartTooltipValue>
      )}
    </ChartTooltipBox>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
