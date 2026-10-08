import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowLeft } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cpu } from "@/components/icons";
import { CardHeading } from "@/components/card-heading";
import { StatStrip } from "@/components/stat-strip";
import { formatNumber } from "@/lib/format";
import { DeviceHeader } from "../devices/device-header";
import sensorService, {
  type SensorHistoryEntry,
  sensorReadingIntervalMs,
  sensorType,
} from "@/api/services/sensor-service";
import {
  formatSpan,
  sensorActive,
  sensorEndedAt,
  sensorGraceMs,
  sensorRatedMs,
  sensorStart,
  sensorWornMs,
  uniqueSensors,
} from "@/lib/sensor";
import glucoseService, {
  type GlucoseEntry,
} from "@/api/services/glucose-service";
import settingsService from "@/api/services/settings-service";
import {
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";
import { TimeInRangeCard } from "@/pages/panel/overview/glucose-cards";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function SensorDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const sensors = useQuery({
    queryKey: ["sensor-history"],
    queryFn: sensorService.history,
  });
  const glucose = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });

  const allSensors = useMemo(
    () => uniqueSensors(sensors.data?.sensors ?? []),
    [sensors.data],
  );
  // Looked up in the raw list: a re-registration `uniqueSensors` folded away
  // still has to resolve, and it carries the same session as the row kept.
  const sensor = sensors.data?.sensors?.find((entry) => entry.id === id);

  const unit = settings.data?.glucose_unit;
  const low = settings.data?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings.data?.glucose_target_high ?? DEFAULT_TARGET_HIGH;

  // The readings this sensor produced: from its session start to the moment it
  // really came off — not to `expires_at`, which on an early swap would pull in
  // the successor's readings too.
  const readings = useMemo<GlucoseEntry[]>(() => {
    if (!sensor) {
      return [];
    }
    const start = sensorStart(sensor);
    const end = sensorEndedAt(sensor, allSensors) ?? Date.now();
    return (glucose.data?.entries ?? [])
      .filter((entry) => entry.time >= start && entry.time <= end)
      .sort((first, second) => first.time - second.time);
  }, [sensor, allSensors, glucose.data]);

  return (
    <PanelPage
      title={sensor ? sensorType(sensor.data) : t("devices.title")}
      parents={[
        { title: t("nav.devices") },
        { title: t("nav.sensor"), href: "/devices/sensor" },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Button asChild variant="secondary" size="sm" className="self-start">
          <Link to="/devices/sensor">
            <ArrowLeft className="size-4" />
            {t("devices.back")}
          </Link>
        </Button>

        {!sensor ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <>
            <SensorHeader sensor={sensor} allSensors={allSensors} />
            <TimelineFacts sensor={sensor} allSensors={allSensors} />
            {readings.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">{t("devices.no_readings")}</Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-1">
                  <TimeInRangeCard
                    entries={readings}
                    low={low}
                    high={high}
                    unit={unit}
                    isLoading={glucose.isLoading}
                  />
                </div>
                <div className="min-w-0 lg:col-span-2">
                  <GlucoseSummaryCard
                    sensor={sensor}
                    allSensors={allSensors}
                    readings={readings}
                    unit={unit}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PanelPage>
  );
}

/**
 * The sensor open on the page: type, status line, and how long it was really
 * on the body against the lifetime it was rated for.
 */
function SensorHeader({
  sensor,
  allSensors,
}: {
  sensor: SensorHistoryEntry;
  allSensors: SensorHistoryEntry[];
}) {
  const { t } = useTranslation();
  const active = sensorActive(sensor, allSensors);
  const endedAt = sensorEndedAt(sensor, allSensors);
  const early = !active && (endedAt ?? 0) < sensor.expires_at;
  const worn = sensorWornMs(sensor, allSensors);
  const rated = sensorRatedMs(sensor);
  const remaining = Math.max(0, sensor.expires_at - Date.now());
  // Worn past the rated days but still reading: the sensor is in its grace
  // window (~12 h on a G7). The bar is clamped, so that shows as full.
  const inGrace = active && worn > rated;

  const note = () => {
    if (inGrace) {
      return t("devices.in_grace", { span: formatSpan(remaining, t) });
    }
    if (active) {
      return t("devices.remaining_span", { span: formatSpan(remaining, t) });
    }
    // Under an hour short of the rated term is the sensor simply running out,
    // not a swap worth calling out.
    const shortfall = rated - worn;
    if (shortfall > 60 * 60 * 1000) {
      return t("devices.ended_early", { span: formatSpan(shortfall, t) });
    }
    return t("devices.ran_full_term");
  };

  return (
    <div>
      <DeviceHeader
        icon={<Cpu />}
        name={sensorType(sensor.data)}
        status={active ? t("devices.active") : early ? t("devices.replaced") : t("devices.expired")}
        connected={active}
        bars={[
          {
            label: active ? t("devices.worn_so_far") : t("devices.worn"),
            value: `${formatSpan(worn, t)} / ${formatSpan(rated, t)}`,
            fraction: rated > 0 ? worn / rated : 0,
          },
        ]}
      />
      <p className="-mt-3 text-[13px] text-muted-foreground">{note()}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {t("devices.sensor_id")} {sensor.id}
      </p>
    </div>
  );
}

/** One label and its value as a divider row. */
function FactRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3" title={hint}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <b className="text-right text-sm">{value}</b>
    </div>
  );
}

/** When the sensor started, when it stopped, and what it was rated for. */
function TimelineFacts({
  sensor,
  allSensors,
}: {
  sensor: SensorHistoryEntry;
  allSensors: SensorHistoryEntry[];
}) {
  const { t } = useTranslation();
  const endedAt = sensorEndedAt(sensor, allSensors);
  const stamp = (time: number) => format(new Date(time), "dd.MM.yyyy HH:mm");
  return (
    <Card className="gap-0 px-6 py-3">
      <div className="grid gap-x-10 divide-y divide-divider md:grid-cols-2 md:divide-y-0">
        <div className="divide-y divide-divider">
          <FactRow label={t("devices.col_started")} value={stamp(sensorStart(sensor))} />
          <FactRow
            label={endedAt === null ? t("devices.col_expires") : t("devices.ended")}
            value={stamp(endedAt ?? sensor.expires_at)}
          />
        </div>
        <div className="divide-y divide-divider">
          <FactRow
            label={t("devices.rated_lifetime")}
            value={formatSpan(sensorRatedMs(sensor), t)}
            hint={t("devices.grace_hint", { span: formatSpan(sensorGraceMs(sensor), t) })}
          />
          <FactRow
            label={t("devices.col_registered")}
            value={stamp(sensor.registered_at)}
            hint={t("devices.registered_hint")}
          />
        </div>
      </div>
    </Card>
  );
}

/** What the sensor measured while it ran. */
function GlucoseSummaryCard({
  sensor,
  allSensors,
  readings,
  unit,
}: {
  sensor: SensorHistoryEntry;
  allSensors: SensorHistoryEntry[];
  readings: GlucoseEntry[];
  unit?: string;
}) {
  const { t } = useTranslation();
  const values = readings.map((entry) => entry.value);
  const average = Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  const worn = sensorWornMs(sensor, allSensors);
  const perDay = worn > 0 ? Math.round(readings.length / (worn / DAY_MS)) : 0;
  const expected = Math.max(
    1,
    Math.round(worn / sensorReadingIntervalMs(sensor.data)),
  );
  const coverage = Math.min(100, Math.round((readings.length / expected) * 100));

  const stamp = (time: number) => format(new Date(time), "dd.MM.yyyy HH:mm");
  return (
    <Card className="h-full gap-0 p-6">
      <CardHeading title={t("devices.glucose_summary")} />
      <div className="mt-[18px]">
        <StatStrip
          cells={[
            { label: t("devices.avg"), value: toDisplay(average, unit), unit: unitLabel(unit) },
            { label: t("devices.min"), value: toDisplay(Math.min(...values), unit), unit: unitLabel(unit) },
            { label: t("devices.max"), value: toDisplay(Math.max(...values), unit), unit: unitLabel(unit) },
            { label: t("devices.readings"), value: formatNumber(readings.length) },
          ]}
        />
      </div>
      <div className="mt-2 divide-y divide-divider">
        <FactRow label={t("devices.readings_per_day")} value={formatNumber(perDay)} />
        <FactRow label={t("devices.coverage")} value={`${coverage} %`} hint={t("devices.coverage_hint")} />
        <FactRow label={t("devices.first_reading")} value={stamp(readings[0].time)} />
        <FactRow label={t("devices.last_reading")} value={stamp(readings[readings.length - 1].time)} />
      </div>
    </Card>
  );
}
