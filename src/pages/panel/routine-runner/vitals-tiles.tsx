// Live glucose + pulse. The pulse comes from the phone's live relay rather than
// the stored curve: the band delivers ~1 Hz, and reading it back at that rate
// means one tiny value, not the whole (minute-resolution) history on every poll.
// An absent `b` already means "not live" — the backend drops a stale reading —
// so there is no staleness gate to get wrong here. Both tiles carry a mini
// sparkline of the last few minutes and are stained by status, not a fixed hue.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight, Droplet, Heart } from "@/components/icons";
import glucoseService, { type GlucoseEntry } from "@/api/services/glucose-service";
import healthService from "@/api/services/health-service";
import settingsService from "@/api/services/settings-service";
import {
  classify,
  toDisplay,
  unitLabel,
  DEFAULT_TARGET_LOW,
  DEFAULT_TARGET_HIGH,
} from "@/lib/glucose";
import { useGlucoseHex } from "@/lib/use-glucose-hex";

export function VitalsTiles() {
  const { t } = useTranslation();
  const hex = useGlucoseHex();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });
  const { data: glucose } = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
    refetchInterval: 60000,
  });
  const { data: live } = useQuery({
    queryKey: ["live-pulse"],
    queryFn: healthService.livePulse,
    refetchInterval: 1000,
  });

  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;

  const entries = useMemo(
    () => [...(glucose?.entries ?? [])].sort((left, right) => left.time - right.time),
    [glucose?.entries],
  );
  const latestGlucose = entries[entries.length - 1];
  const glucoseColor = hex[latestGlucose ? classify(latestGlucose.value, low, high) : "in-range"];
  const perMinute = trendPerMinute(entries);
  // The last five points make the mini glucose trend; at minute resolution that
  // is the recent window the user asked to see beside the reading.
  const glucoseSeries = entries.slice(-5).map((entry) => entry.value);

  const bpm = live?.b;
  const pulseSeries = useLivePulseSeries(bpm);
  const pulseColor = bpm == null ? "var(--muted-foreground)" : hex[pulseZone(bpm)];

  return (
    <div className="grid grid-cols-2 gap-3">
      <VitalTile
        icon={<Droplet className="size-6" />}
        value={latestGlucose ? toDisplay(latestGlucose.value, unit) : "–"}
        unit={unitLabel(unit)}
        color={glucoseColor}
        series={glucoseSeries}
        trend={perMinute}
      />
      <VitalTile
        icon={<Heart className="size-6" />}
        value={bpm ?? "–"}
        unit={t("pulse.bpm")}
        color={pulseColor}
        series={pulseSeries}
      />
    </div>
  );
}

// Live bpm has no history from the backend, so accumulate the ~1 Hz relay into
// a short ring buffer for its sparkline. Kept in a ref (mirrored to state so the
// tile repaints) because the 1 Hz refetch already drives the rerender.
function useLivePulseSeries(bpm: number | undefined) {
  const seriesRef = useRef<number[]>([]);
  const [series, setSeries] = useState<number[]>([]);
  useEffect(() => {
    if (bpm == null) {
      return;
    }
    seriesRef.current = [...seriesRef.current, bpm].slice(-60);
    setSeries(seriesRef.current);
  }, [bpm]);
  return series;
}

// Trend arrow buckets (mg/dL per minute), mirroring the app's five directions.
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
      <Icon size={48} strokeWidth={2.5} />
    </span>
  );
}

// Slope against a reading 1–60 min before the latest; falls back to the
// immediately previous reading. Mirrors the overview card's trend.
function trendPerMinute(entries: GlucoseEntry[]) {
  const latest = entries[entries.length - 1];
  if (!latest || entries.length < 2) {
    return undefined;
  }
  const previous =
    [...entries].reverse().find((entry) => {
      const minutesApart = (latest.time - entry.time) / 60000;
      return minutesApart >= 1 && minutesApart <= 60;
    }) ?? entries[entries.length - 2];
  if (latest.time === previous.time) {
    return undefined;
  }
  return (latest.value - previous.value) / ((latest.time - previous.time) / 60000);
}

// ponytail: fixed resting-HR zones (normal / elevated / high). No HR-zone
// setting exists yet; wire it to settings once the app grows one.
function pulseZone(bpm: number): "in-range" | "high" | "low" {
  if (bpm < 100) {
    return "in-range";
  }
  if (bpm < 140) {
    return "high";
  }
  return "low";
}

// A flat inline sparkline — no chart lib for a dozen points read at arm's length.
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div className="h-9" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 100;
  const height = 24;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-9 w-full" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// One vital, sized to be read at arm's length mid-set rather than leaned into.
function VitalTile({
  icon,
  value,
  unit,
  color,
  series,
  trend,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  unit: string;
  color: string;
  series: number[];
  trend?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-5">
      <span className="flex items-center gap-2 text-base font-medium text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        {unit}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-8xl leading-none font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        {trend !== undefined && <TrendArrow perMin={trend} color={color} />}
      </div>
      <Sparkline values={series} color={color} />
    </div>
  );
}
