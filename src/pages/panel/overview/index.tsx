import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
} from "lucide-react";
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
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import glucoseService from "@/api/services/glucose-service";
import sensorService from "@/api/services/sensor-service";
import settingsService from "@/api/services/settings-service";
import {
  classify,
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  statusColorVar,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";

// SVG attributes (stop-color, stroke, lucide `color`) don't resolve CSS var(),
// so resolve the glucose vars to concrete hex; re-read when the theme flips.
function useGlucoseHex() {
  const read = () => {
    const s = getComputedStyle(document.documentElement);
    return {
      low: s.getPropertyValue("--glucose-low").trim() || "#e0533d",
      "in-range": s.getPropertyValue("--glucose-in-range").trim() || "#2e9e5b",
      high: s.getPropertyValue("--glucose-high").trim() || "#e8a13a",
    } as Record<string, string>;
  };
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    return () => obs.disconnect();
  }, []);
  return colors;
}

// Trend arrow buckets (mg/dL per minute), mirroring the app's 5 directions.
// Colour comes from `currentColor` (set on the wrapper) so it can't fall foul
// of how lucide maps the `color` prop.
function TrendArrow({ perMin, color }: { perMin: number; color: string }) {
  const Icon =
    perMin >= 2
      ? ArrowUp
      : perMin >= 1
        ? ArrowUpRight
        : perMin > -1
          ? ArrowRight
          : perMin > -2
            ? ArrowDownRight
            : ArrowDown;
  return (
    <span style={{ color }}>
      <Icon size={44} strokeWidth={2.5} />
    </span>
  );
}

// Themed replacement for the default Recharts tooltip (whose hardcoded white
// box left white-on-white text in dark mode). Recharts injects active/payload.
function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">
        {format(new Date(label as number), "dd.MM. HH:mm")}
      </div>
      <div className="text-sm font-semibold text-popover-foreground">
        {toDisplay(Number(payload[0].value), unit)} {unitLabel(unit)}
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-secondary/60 p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      <span className="text-2xl font-bold">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default function OverviewPage() {
  const { t } = useTranslation();
  const statusLabel: Record<string, string> = {
    low: t("overview.status_low"),
    "in-range": t("overview.status_in_range"),
    high: t("overview.status_high"),
  };
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const { data: glucose, isLoading } = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
  });
  const { data: sensor } = useQuery({
    queryKey: ["sensor-current"],
    queryFn: sensorService.current,
  });

  const hex = useGlucoseHex();
  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;

  const entries = (glucose?.entries ?? [])
    .slice()
    .sort((a, b) => a.time - b.time);
  const latest = entries[entries.length - 1];
  const latestStatus = latest ? classify(latest.value, low, high) : "in-range";
  const latestColor = hex[latestStatus];

  // Trend per minute: slope against a reading 1–60 min before the latest (scan
  // back so odd spacing/duplicate timestamps at the tail don't drop the arrow);
  // fall back to the immediately previous reading if nothing lands in-window.
  const prev =
    latest && entries.length >= 2
      ? ([...entries]
          .reverse()
          .find((e) => {
            const g = (latest.time - e.time) / 60;
            return g >= 1 && g <= 60;
          }) ?? entries[entries.length - 2])
      : undefined;
  const trendPerMin =
    latest && prev && latest.time !== prev.time
      ? (latest.value - prev.value) / ((latest.time - prev.time) / 60)
      : undefined;

  const counts = { low: 0, "in-range": 0, high: 0 };
  for (const e of entries) counts[classify(e.value, low, high)]++;
  const pct = (n: number) =>
    entries.length ? Math.round((n / entries.length) * 100) : 0;
  const tir = pct(counts["in-range"]);

  const chartData = entries.slice(-288).map((e) => ({
    t: e.time * 1000, // seconds -> ms
    value: e.value,
  }));

  // Zone colouring is an SVG gradient in objectBoundingBox units: offset 0..1
  // maps to each shape's OWN bounding box, so the thresholds must be expressed
  // relative to that box — not the axis domain (which was the earlier bug).
  //  • stroke (the line) box spans [dataMin, dataMax]
  //  • fill (area to baseline) box spans [dataMax, yMin]
  const values = chartData.map((d) => d.value);
  const dataMin = values.length ? Math.min(...values) : low;
  const dataMax = values.length ? Math.max(...values) : high;
  const yMin = Math.min(low - 20, dataMin);
  const yMax = Math.max(high + 20, dataMax);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const strokeSpan = Math.max(1, dataMax - dataMin);
  const strokeHighOff = clamp((dataMax - high) / strokeSpan);
  const strokeLowOff = clamp((dataMax - low) / strokeSpan);
  const fillSpan = Math.max(1, dataMax - yMin);
  const fillHighOff = clamp((dataMax - high) / fillSpan);
  const fillLowOff = clamp((dataMax - low) / fillSpan);

  const sensorExpiry = sensor?.expires_at
    ? Math.max(
        0,
        Math.round((sensor.expires_at - Date.now()) / (1000 * 60 * 60)),
      )
    : undefined;

  return (
    <PanelPage title={t("overview.title")}>
      <div className="py-6 flex flex-col gap-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-6 md:grid-cols-3 md:items-center">
            <div className="md:col-span-1 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                {t("overview.current_glucose")}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="text-6xl font-bold leading-none"
                  style={latest ? { color: latestColor } : undefined}
                >
                  {latest ? toDisplay(latest.value, unit) : "–"}
                </span>
                {trendPerMin !== undefined && (
                  <TrendArrow perMin={trendPerMin} color={latestColor} />
                )}
                <span className="text-lg text-muted-foreground">
                  {unitLabel(unit)}
                </span>
              </div>
              {latest && (
                <span
                  className="mt-1 w-fit rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: latestColor }}
                >
                  {statusLabel[latestStatus]}
                </span>
              )}
              <span className="mt-1 text-xs text-muted-foreground">
                {latest
                  ? t("overview.last", {
                      time: format(new Date(latest.time * 1000), "dd.MM. HH:mm"),
                    })
                  : t("overview.no_readings")}
              </span>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-2 rounded-xl bg-secondary/60 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("overview.time_in_range")}
                  </span>
                  <span className="text-2xl font-bold">{tir} %</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-background">
                  {(["low", "in-range", "high"] as const).map((k) =>
                    counts[k] ? (
                      <div
                        key={k}
                        style={{
                          width: `${pct(counts[k])}%`,
                          backgroundColor: statusColorVar[k],
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span style={{ color: statusColorVar.low }}>
                    {t("overview.low")} {pct(counts.low)} %
                  </span>
                  <span style={{ color: statusColorVar.high }}>
                    {t("overview.high")} {pct(counts.high)} %
                  </span>
                </div>
              </div>
              <MiniStat
                title={t("overview.target_range")}
                value={`${low}–${high}`}
                hint="mg/dL"
              />
              <MiniStat
                title={t("overview.avg_today")}
                value={
                  entries.length
                    ? toDisplay(
                        entries.reduce((a, e) => a + e.value, 0) /
                          entries.length,
                        unit,
                      )
                    : "–"
                }
                hint={unitLabel(unit)}
              />
              <MiniStat
                title={t("overview.sensor")}
                value={sensorExpiry != null ? `${sensorExpiry} h` : "–"}
                hint={sensor?.type ?? t("overview.no_active_sensor")}
              />
              <MiniStat
                title={t("overview.readings")}
                value={String(entries.length)}
                hint={t("overview.in_history")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("overview.history")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                {t("common.loading")}
              </p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("common.no_data")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
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
                    tickFormatter={(t) => format(new Date(t), "HH:mm")}
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
                  {latest && (
                    <ReferenceDot
                      x={latest.time * 1000}
                      y={latest.value}
                      r={5}
                      fill={latestColor}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </PanelPage>
  );
}
