// Live glucose + pulse. The pulse comes from the phone's live relay rather than
// the stored curve: the band delivers ~1 Hz, and reading it back at that rate
// means one tiny value, not the whole (minute-resolution) history on every poll.
// An absent `b` already means "not live" — the backend drops a stale reading —
// so there is no staleness gate to get wrong here. Both read open in the
// column, no box around them: the value, and a line of the recent course (see
// vital-history) beneath it, glucose coloured by range and the pulse violet.
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

  return (
    <div className="grid grid-cols-1 gap-x-8 min-[640px]:max-[1299px]:grid-cols-2">
      <h2 className="mb-1 text-base font-extrabold min-[640px]:max-[1299px]:col-span-2">{t("routines.vitals")}</h2>
      <VitalTile
        icon={<Droplet size={15} color={glucoseColor} aria-hidden />}
        label={t("nav.glucose")}
        value={latestGlucose ? toDisplay(latestGlucose.value, unit) : "–"}
        unit={unitLabel(unit)}
        trend={perMinute}
      >
        <Sparkline
          points={glucoseSeries}
          windowMs={GLUCOSE_WINDOW_HOURS * 3_600_000}
          limits={[low, high]}
          color={glucoseColor}
          bands={[
            { color: hex.high, until: high },
            { color: hex["in-range"], until: low },
            { color: hex.low },
          ]}
          emptyLabel={t("common.no_data")}
        />
      </VitalTile>
      <VitalTile
        divided
        icon={<Heart size={15} color="var(--pulse)" aria-hidden />}
        label={t("nav.pulse")}
        value={bpm ?? "–"}
        unit={t("pulse.bpm")}
      >
        <Sparkline
          points={pulseSeries}
          windowMs={PULSE_WINDOW_MINUTES * 60_000}
          limits={[PULSE_SCALE_LOW, PULSE_SCALE_HIGH]}
          color="var(--pulse)"
          emptyLabel={t("common.no_data")}
        />
      </VitalTile>
    </div>
  );
}

// ponytail: a fixed resting range that keeps the pulse line's scale steady;
// the line is violet whatever the value, so no zone needs to be known here.
const PULSE_SCALE_LOW = 60;
const PULSE_SCALE_HIGH = 100;

// One vital, open in the column: what it is, the value with unit and trend,
// and its recent course beneath. A hairline separates the two.
function VitalTile({
  icon,
  label,
  value,
  unit,
  trend,
  divided = false,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit: string;
  trend?: number;
  divided?: boolean;
  children: React.ReactNode;
}) {
  const hasValue = value !== "–";
  return (
    <section
      aria-label={label}
      className={`flex min-w-0 flex-col py-[22px] ${divided ? "border-t border-divider min-[640px]:max-[1299px]:border-t-0" : ""}`}
    >
      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="mt-1.5 flex items-center gap-[5px]">
        <b className="text-[40px] leading-none font-extrabold tracking-[-0.03em]">{value}</b>
        {trend !== undefined && hasValue && <GlucoseTrendArrow perMin={trend} color="var(--text)" size={20} />}
        <span className="text-sm text-muted-foreground">{unit}</span>
      </span>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}
