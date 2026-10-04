// Live glucose + pulse. The pulse comes from the phone's live relay rather than
// the stored curve: the band delivers ~1 Hz, and reading it back at that rate
// means one tiny value, not the whole (minute-resolution) history on every poll.
// An absent `b` already means "not live" — the backend drops a stale reading —
// so there is no staleness gate to get wrong here. Both read open on the
// page, no box around them: the value in its status colour, and a line of the
// recent course (see vital-history) beneath it.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Droplet, Heart } from "@/components/icons";
import { GlucoseTrendArrow } from "@/components/glucose-trend-arrow";
import glucoseService from "@/api/services/glucose-service";
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
import { trendPerMinute } from "@/lib/glucose-trend";
import {
  GLUCOSE_WINDOW_HOURS,
  PULSE_WINDOW_MINUTES,
  usePulseHistory,
  type VitalPoint,
} from "./vital-history";
import { Sparkline } from "./vital-sparkline";

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
  const glucoseSince = Date.now() - GLUCOSE_WINDOW_HOURS * 3_600_000;
  const glucoseSeries = entries
    .filter((entry) => entry.time >= glucoseSince)
    .map((entry) => ({ t: entry.time, v: entry.value }));

  const bpm = live?.b;
  const pulseSeries = usePulseHistory(bpm);
  const pulseColor = bpm == null ? "var(--muted-foreground)" : hex[pulseZone(bpm)];

  return (
    <div className="grid grid-cols-2 gap-6 xl:grid-cols-1">
      <VitalTile
        icon={<Droplet className="size-5" weight="fill" />}
        label={t("nav.glucose")}
        value={latestGlucose ? toDisplay(latestGlucose.value, unit) : "–"}
        unit={unitLabel(unit)}
        color={glucoseColor}
        series={glucoseSeries}
        windowMs={GLUCOSE_WINDOW_HOURS * 3_600_000}
        limits={[low, high]}
        trend={perMinute}
      />
      <VitalTile
        divided
        icon={<Heart className="size-5" weight="fill" />}
        label={t("nav.pulse")}
        value={bpm ?? "–"}
        unit={t("pulse.bpm")}
        color={pulseColor}
        series={pulseSeries}
        windowMs={PULSE_WINDOW_MINUTES * 60_000}
        limits={[PULSE_ELEVATED, PULSE_HIGH]}
      />
    </div>
  );
}

// ponytail: fixed resting-HR zones (normal / elevated / high). The app keeps its
// own zones (hr_zone_elevated / hr_zone_high in the settings); read those here
// if the two ever need to agree.
const PULSE_ELEVATED = 100;
const PULSE_HIGH = 140;

function pulseZone(bpm: number): "in-range" | "high" | "low" {
  if (bpm < PULSE_ELEVATED) {
    return "in-range";
  }
  if (bpm < PULSE_HIGH) {
    return "high";
  }
  return "low";
}

// One vital, open on the page: what it is, the value in its status colour with
// unit and trend, and its recent course beneath. A hairline separates the two
// when they stand in one column.
function VitalTile({
  icon,
  label,
  value,
  unit,
  color,
  series,
  windowMs,
  limits,
  trend,
  divided = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit: string;
  color: string;
  series: VitalPoint[];
  windowMs: number;
  limits: number[];
  trend?: number;
  divided?: boolean;
}) {
  const { t } = useTranslation();
  const hasValue = value !== "–";
  return (
    <section aria-label={label} className={`flex min-w-0 flex-col gap-1 ${divided ? "border-l pl-6 xl:border-t xl:border-l-0 xl:pt-6 xl:pl-0" : ""}`}>
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span style={{ color: hasValue ? color : undefined }}>{icon}</span>
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className="text-6xl leading-none font-bold tracking-tight tabular-nums"
          style={{ color: hasValue ? color : "var(--muted-foreground)" }}
        >
          {value}
        </span>
        <span className="text-base font-medium text-muted-foreground">{unit}</span>
        {trend !== undefined && hasValue && (
          <span className="self-center">
            <GlucoseTrendArrow perMin={trend} color={color} size={28} />
          </span>
        )}
      </div>
      <Sparkline
        points={series}
        windowMs={windowMs}
        limits={limits}
        color={color}
        emptyLabel={t("common.no_data")}
      />
    </section>
  );
}
