import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
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
      <div className="py-6 flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
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
            <WearCard sensor={sensor} allSensors={allSensors} />
            <TimelineTiles sensor={sensor} allSensors={allSensors} />
            {readings.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {t("devices.no_readings")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <TimeInRangeCard
                    entries={readings}
                    low={low}
                    high={high}
                    unit={unit}
                    isLoading={glucose.isLoading}
                  />
                </div>
                <div className="lg:col-span-2">
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

/** Type, status pill and the raw id the backend keys the sensor by. */
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
  const color = active
    ? "var(--glucose-in-range)"
    : "var(--muted-foreground)";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">{sensorType(sensor.data)}</h2>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {t("devices.sensor_id")} {sensor.id}
        </p>
      </div>
      <span
        className="rounded-full px-3 py-1 text-xs font-semibold"
        style={{
          color,
          backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
        }}
      >
        {active
          ? t("devices.active")
          : early
            ? t("devices.replaced")
            : t("devices.expired")}
      </span>
    </div>
  );
}

/**
 * The headline figure: how long the sensor was really on the body, drawn
 * against the lifetime it was rated for.
 */
function WearCard({
  sensor,
  allSensors,
}: {
  sensor: SensorHistoryEntry;
  allSensors: SensorHistoryEntry[];
}) {
  const { t } = useTranslation();
  const active = sensorActive(sensor, allSensors);
  const worn = sensorWornMs(sensor, allSensors);
  const rated = sensorRatedMs(sensor);
  // Worn past the rated days but still reading: the sensor is in its grace
  // window (~12 h on a G7). The bar is clamped, so that shows as a full 100%.
  const percent = rated > 0 ? Math.min(100, (worn / rated) * 100) : 0;
  const remaining = Math.max(0, sensor.expires_at - Date.now());
  const inGrace = active && worn > rated;
  const color = inGrace
    ? "var(--glucose-high)"
    : active
      ? "var(--glucose-in-range)"
      : "var(--muted-foreground)";

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
    <Card>
      <CardHeader>
        <CardTitle>
          {active ? t("devices.worn_so_far") : t("devices.worn")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-4xl font-bold leading-none" style={{ color }}>
            {formatSpan(worn, t)}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("devices.of_rated", { span: formatSpan(rated, t) })}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full"
            style={{ width: `${percent}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{note()}</span>
      </CardContent>
    </Card>
  );
}

/** When the sensor started, when it stopped, and what it was rated for. */
function TimelineTiles({
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        label={t("devices.col_started")}
        value={stamp(sensorStart(sensor))}
      />
      <StatTile
        label={endedAt === null ? t("devices.col_expires") : t("devices.ended")}
        value={stamp(endedAt ?? sensor.expires_at)}
      />
      <StatTile
        label={t("devices.rated_lifetime")}
        value={formatSpan(sensorRatedMs(sensor), t)}
        hint={t("devices.grace_hint", { span: formatSpan(sensorGraceMs(sensor), t) })}
      />
      <StatTile
        label={t("devices.col_registered")}
        value={stamp(sensor.registered_at)}
        hint={t("devices.registered_hint")}
      />
    </div>
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
  const withUnit = (mgdl: number) => `${toDisplay(mgdl, unit)} ${unitLabel(unit)}`;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t("devices.glucose_summary")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={t("devices.avg")} value={withUnit(average)} />
        <StatTile label={t("devices.min")} value={withUnit(Math.min(...values))} />
        <StatTile label={t("devices.max")} value={withUnit(Math.max(...values))} />
        <StatTile label={t("devices.readings")} value={String(readings.length)} />
        <StatTile label={t("devices.readings_per_day")} value={String(perDay)} />
        <StatTile
          label={t("devices.coverage")}
          value={`${coverage}%`}
          hint={t("devices.coverage_hint")}
        />
        <StatTile
          label={t("devices.first_reading")}
          value={format(new Date(readings[0].time), "dd.MM.yyyy HH:mm")}
        />
        <StatTile
          label={t("devices.last_reading")}
          value={format(
            new Date(readings[readings.length - 1].time),
            "dd.MM.yyyy HH:mm",
          )}
        />
      </CardContent>
    </Card>
  );
}
