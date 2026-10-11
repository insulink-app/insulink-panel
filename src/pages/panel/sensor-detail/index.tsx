import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import PanelPage from "@/layouts/panel";
import { Cpu } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { CardSkeleton } from "@/components/card-skeleton";
import { GlucoseLineChart } from "@/components/glucose-line-chart";
import { KpiStrip } from "@/components/kpi-strip";
import glucoseService from "@/api/services/glucose-service";
import sensorService, { sensorReadingIntervalMs } from "@/api/services/sensor-service";
import settingsService from "@/api/services/settings-service";
import { DEFAULT_TARGET_HIGH, DEFAULT_TARGET_LOW, toDisplay, unitLabel } from "@/lib/glucose";
import { formatNumber } from "@/lib/format";
import { formatSpan } from "@/lib/sensor";
import { formatDay, formatWhen } from "@/lib/when";
import { BackPill, CompareCard, DeviceHero, FactsCard, RuntimeCard } from "../devices/detail-parts";
import { isRunning, sensorRecords, type DeviceRecord } from "../devices/records";
import { sensorReadings, sensorStats, type SensorStats } from "../devices/sensor-stats";

const COMPARED = 4;
const DAY = 24 * 60 * 60 * 1000;

/** One sensor: its runtime, what it measured, its signal, the latest sensors beside it, and its identifiers. */
export default function SensorDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const sensors = useQuery({ queryKey: ["sensor-history"], queryFn: sensorService.history });
  const glucose = useQuery({ queryKey: ["glucose-history"], queryFn: glucoseService.history });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });
  const records = useMemo(() => sensorRecords(sensors.data?.sensors ?? []), [sensors.data]);
  const record = records.find((entry) => entry.id === id);
  const raw = sensors.data?.sensors?.find((entry) => entry.id === id);
  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;
  const interval = raw ? sensorReadingIntervalMs(raw.data) : 5 * 60_000;
  const statsOf = (entry: DeviceRecord) =>
    sensorStats(sensorReadings(entry, glucose.data?.entries ?? []), entry, interval, low, high);

  return (
    <PanelPage
      title={record?.name ?? t("nav.sensor")}
      parents={[{ title: t("nav.devices") }, { title: t("nav.sensor"), href: "/devices/sensor" }]}
    >
      <div className="flex flex-col gap-5">
        <BackPill to="/devices/sensor" label={t("devices.back_sensors")} />
        {sensors.isLoading ? (
          <CardSkeleton />
        ) : !record ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          <SensorView record={record} records={records} stats={statsOf} unit={unit} low={low} high={high} />
        )}
      </div>
    </PanelPage>
  );
}

function SensorView({
  record,
  records,
  stats,
  unit,
  low,
  high,
}: {
  record: DeviceRecord;
  records: DeviceRecord[];
  stats: (record: DeviceRecord) => SensorStats | null;
  unit?: string;
  low: number;
  high: number;
}) {
  const { t, i18n } = useTranslation();
  const own = stats(record);
  const status = t(isRunning(record) ? "devices.active" : record.status === "replaced" ? "devices.replaced" : "devices.expired");
  const compared = records.slice(0, COMPARED);
  return (
    <>
      <DeviceHero icon={<Cpu />} record={record} status={record.code ? t("devices.status_code", { status, code: record.code }) : status} />
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <RuntimeCard record={record} startLabel={t("devices.col_started")} />
        <GlucoseCard record={record} stats={own} unit={unit} low={low} high={high} />
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
        <FactsCard
          title={t("devices.signal")}
          rows={[
            { label: t("devices.signal_losses"), value: own ? formatNumber(own.losses) : "–" },
            { label: t("devices.longest_gap"), value: own ? gapLabel(own.longestGapMs, t) : "–" },
            { label: t("devices.last_value"), value: own?.last ? t("devices.ago", { span: gapLabel(Date.now() - own.last, t) }) : "–" },
          ]}
        >
          <p className="mt-4 whitespace-nowrap">
            <b className="text-[44px] leading-none font-extrabold">{own ? own.coverage : "–"}</b>
            <span className="ml-1.5 text-base font-bold text-muted-foreground">{t("devices.coverage_label")}</span>
          </p>
          {own && <p className="mt-2 text-sm text-muted-foreground">{t("devices.coverage_of", { count: own.count, expected: own.expected })}</p>}
        </FactsCard>
        <CompareCard
          title={t("devices.compare")}
          hint={t("devices.latest_sensors")}
          columns={[t("devices.col_sensor"), t("devices.col_started"), t("devices.col_runtime"), t("devices.col_in_range"), t("devices.col_avg", { unit: unitLabel(unit) }), t("devices.col_coverage")]}
          rows={compared.map((entry) => {
            const entryStats = entry === record ? own : stats(entry);
            return {
              key: entry.id,
              current: entry === record,
              cells: [
                <>
                  <b>{entry.name}</b> <span className="font-mono text-xs text-muted-foreground">{entry.code}</span>
                </>,
                isRunning(entry) ? t("devices.current") : formatDay(entry.start, t, i18n.language),
                formatSpan(entry.worn, t),
                entryStats ? `${entryStats.inRange} %` : "–",
                entryStats ? toDisplay(entryStats.average, unit) : "–",
                entryStats ? `${entryStats.coverage} %` : "–",
              ],
            };
          })}
        />
        <FactsCard
          title={t("devices.details")}
          rows={[
            { label: t("devices.col_code"), value: record.code ?? "–", mono: true },
            { label: t("devices.sensor_id"), value: record.id, mono: true },
            { label: t("devices.rated_lifetime"), value: t("devices.rated_plus", { rated: formatSpan(record.rated, t), grace: formatSpan(record.grace, t) }) },
            { label: t("devices.registered"), value: formatWhen(record.registeredAt, t, i18n.language) },
          ]}
        />
      </div>
    </>
  );
}

/** Average, lowest, highest and time in range, the glucose line since the start, and the range split as a bar. */
function GlucoseCard({ record, stats, unit, low, high }: { record: DeviceRecord; stats: SensorStats | null; unit?: string; low: number; high: number }) {
  const { t, i18n } = useTranslation();
  const { data } = useQuery({ queryKey: ["glucose-history"], queryFn: glucoseService.history });
  const readings = sensorReadings(record, data?.entries ?? []);
  const end = record.end ?? Date.now();
  const mgdl = unitLabel(unit);
  return (
    <Card className="gap-0 p-6">
      <CardHeading
        title={t("devices.glucose_since")}
        action={
          <span className="text-xs text-muted-foreground">
            {formatDay(record.start, t, i18n.language)} · {format(new Date(record.start), "HH:mm")} – {format(new Date(end), "HH:mm")}
          </span>
        }
      />
      {!stats ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("devices.no_readings")}</p>
      ) : (
        <>
          <div className="mt-5">
            <KpiStrip
              cells={[
                { label: t("devices.avg"), value: toDisplay(stats.average, unit), unit: mgdl },
                { label: t("devices.min"), value: toDisplay(stats.min, unit), unit: mgdl },
                { label: t("devices.max"), value: toDisplay(stats.max, unit), unit: mgdl },
                { label: t("devices.in_range"), value: String(stats.inRange), unit: "%", dot: "var(--range)" },
              ]}
            />
          </div>
          <div className="mt-6 flex-1">
            <GlucoseLineChart
              rows={readings}
              low={low}
              high={high}
              unit={unit}
              start={record.start}
              end={end}
              nowTime={record.end === null ? readings[readings.length - 1]?.time : undefined}
              height={240}
              tickFormat={end - record.start > DAY ? "dd.MM." : "HH:mm"}
            />
          </div>
          <div className="mt-4 flex h-2 gap-1" aria-hidden>
            {[
              { share: stats.high, color: "var(--high)" },
              { share: stats.inRange, color: "var(--range)" },
              { share: stats.low, color: "var(--low)" },
            ]
              .filter((part) => part.share > 0)
              .map((part) => (
                <i key={part.color} className="block rounded-full" style={{ flexGrow: part.share, backgroundColor: part.color }} />
              ))}
          </div>
          <div className="mt-2.5 flex gap-5 text-xs text-muted-foreground">
            <span>{t("devices.high_share", { value: stats.high })}</span>
            <span>{t("devices.in_range_share", { value: stats.inRange })}</span>
            <span>{t("devices.low_share", { value: stats.low })}</span>
          </div>
        </>
      )}
    </Card>
  );
}

/** A gap as minutes under an hour, else as hours and days. */
function gapLabel(ms: number, t: (key: string, options?: Record<string, number>) => string) {
  return ms < 60 * 60_000 ? t("devices.minutes", { n: Math.round(ms / 60_000) }) : formatSpan(ms, t);
}
