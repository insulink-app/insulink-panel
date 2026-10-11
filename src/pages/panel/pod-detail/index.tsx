import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import { Syringe } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { CardSkeleton } from "@/components/card-skeleton";
import { KpiStrip } from "@/components/kpi-strip";
import nutritionService from "@/api/services/nutrition-service";
import pumpService from "@/api/services/pump-service";
import settingsService from "@/api/services/settings-service";
import { decodeProfiles } from "@/lib/basal";
import { formatNumber } from "@/lib/format";
import { formatSpan } from "@/lib/sensor";
import { formatDay, formatWhen } from "@/lib/when";
import { BackPill, CompareCard, DeviceHero, FactsCard, RuntimeCard } from "../devices/detail-parts";
import { isRunning, podRecords, type DeviceRecord } from "../devices/records";
import { activeInsulin, basalSteps, basalUnits, bolusDoses } from "@/lib/insulin";
import { DeliveryChart } from "./delivery-chart";

const COMPARED = 4;
/** The pod reports its reservoir exactly only below this many units. */
const RESERVOIR_REPORTED_BELOW = 50;
/** The app's low-reservoir alert (`pod_alerts_command.dart`, 200 µl). */
const RESERVOIR_WARNING = 20;
const DEFAULT_INSULIN_HOURS = 3;
const DAY = 24 * 60 * 60 * 1000;

/** One pod: its runtime, what it delivered, its reservoir, the latest pods beside it, and its identifiers. */
export default function PodDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const pods = useQuery({ queryKey: ["pump-history"], queryFn: pumpService.history });
  const records = useMemo(() => podRecords(pods.data?.pumps ?? []), [pods.data]);
  const record = records.find((entry) => entry.id === id);
  return (
    <PanelPage
      title={record?.name ?? t("nav.pump")}
      parents={[{ title: t("nav.devices") }, { title: t("nav.pump"), href: "/devices/pump" }]}
    >
      <div className="flex flex-col gap-5">
        <BackPill to="/devices/pump" label={t("devices.back_pods")} />
        {pods.isLoading ? (
          <CardSkeleton />
        ) : !record ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          <PodView record={record} records={records} />
        )}
      </div>
    </PanelPage>
  );
}

function PodView({ record, records }: { record: DeviceRecord; records: DeviceRecord[] }) {
  const { t, i18n } = useTranslation();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });
  const meals = useQuery({ queryKey: ["meals"], queryFn: nutritionService.meals }).data?.meals ?? [];
  const profiles = decodeProfiles(settings?.basal_profiles);
  const profile = profiles.profiles[profiles.active];
  const end = record.end ?? Date.now();
  const steps = basalSteps(profile.rates, record.start, end);
  const doses = bolusDoses(meals, record.start, end);
  const basal = basalUnits(steps, end);
  const bolus = doses.reduce((sum, dose) => sum + dose.units, 0);
  const insulinHours = Number(settings?.bolus_insulin_duration_h) || DEFAULT_INSULIN_HOURS;
  const insulin = t("nutrition.unit_insulin");
  const perHour = t("settings.units.insulin_per_hour");
  const status = t(isRunning(record) ? "devices.active" : record.status === "replaced" ? "devices.replaced" : "devices.expired");
  const hour = new Date().getHours();
  const nextHour = [...Array(23).keys()].map((offset) => (hour + offset + 1) % 24).find((candidate) => profile.rates[candidate] !== profile.rates[hour]);
  return (
    <>
      <DeviceHero icon={<Syringe />} record={record} status={record.code ? t("devices.status_serial", { status, code: record.code }) : status} />
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <RuntimeCard record={record} startLabel={t("devices.activated")} />
        <Card className="gap-0 p-6">
          <CardHeading
            title={t("devices.delivery")}
            action={
              <span className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <i aria-hidden className="block h-[3px] w-4 rounded bg-brand" />
                  {t("devices.basal")}
                </span>
                <span className="flex items-center gap-1.5">
                  <i aria-hidden className="block size-2 rounded-full bg-teal" />
                  {t("devices.bolus")}
                </span>
              </span>
            }
          />
          <div className="mt-5">
            <KpiStrip
              cells={[
                { label: t("devices.total"), value: formatNumber(basal + bolus, 1), unit: insulin },
                { label: t("devices.basal"), value: formatNumber(basal, 1), unit: insulin, dot: "var(--brand)" },
                { label: t("devices.bolus"), value: formatNumber(bolus, 1), unit: insulin, dot: "var(--teal)" },
                {
                  label: t("devices.active_insulin"),
                  value: isRunning(record) ? formatNumber(activeInsulin(doses, insulinHours, Date.now()), 1) : "–",
                  unit: insulin,
                },
              ]}
            />
          </div>
          <div className="mt-8 flex-1">
            <DeliveryChart steps={steps} doses={doses} start={record.start} end={end} />
          </div>
        </Card>
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
        <FactsCard
          title={t("devices.pod_capacity")}
          rows={[
            {
              label: t("devices.basal_now"),
              value: isRunning(record) ? `${formatNumber(profile.rates[hour], 2)} ${perHour} · ${profile.name}` : "–",
            },
            {
              label: t("devices.next_change"),
              value:
                isRunning(record) && nextHour !== undefined
                  ? `${String(nextHour).padStart(2, "0")}:00 → ${formatNumber(profile.rates[nextHour], 2)} ${perHour}`
                  : t("devices.none"),
            },
            { label: t("devices.warning_at"), value: `${RESERVOIR_WARNING} ${insulin}` },
          ]}
        >
          <p className="mt-4 whitespace-nowrap">
            <b className="text-[44px] leading-none font-extrabold">
              {record.reservoir != null ? formatNumber(record.reservoir, 1) : `> ${RESERVOIR_REPORTED_BELOW}`}
            </b>
            <span className="ml-1.5 text-base font-bold text-muted-foreground">{insulin}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {record.reservoir != null ? t("devices.reservoir_known") : t("devices.reservoir_hint")}
          </p>
        </FactsCard>
        <CompareCard
          title={t("devices.compare")}
          hint={t("devices.latest_pods")}
          columns={[t("devices.col_pod"), t("devices.col_activated"), t("devices.col_runtime"), t("devices.col_rest"), t("devices.col_basal_day")]}
          rows={records.slice(0, COMPARED).map((entry) => {
            const entryEnd = entry.end ?? Date.now();
            const perDay = basalUnits(basalSteps(profile.rates, entry.start, entryEnd), entryEnd) / Math.max(1, (entryEnd - entry.start) / DAY);
            return {
              key: entry.id,
              current: entry === record,
              cells: [
                <>
                  <b>DASH</b> <span className="font-mono text-xs text-muted-foreground">{entry.code}</span>
                </>,
                isRunning(entry) ? t("devices.current") : formatDay(entry.start, t, i18n.language),
                formatSpan(entry.worn, t),
                entry.reservoir != null && !isRunning(entry) ? `${formatNumber(entry.reservoir, 2)} ${insulin}` : "–",
                isRunning(entry) ? "–" : `${formatNumber(perDay, 1)} ${insulin}`,
              ],
            };
          })}
        />
        <FactsCard
          title={t("devices.details")}
          rows={[
            { label: t("devices.lot"), value: record.lot !== undefined ? String(record.lot) : "–", mono: true },
            { label: t("devices.serial"), value: record.code ?? "–", mono: true },
            { label: t("devices.rated_lifetime"), value: t("devices.rated_plus", { rated: formatSpan(record.rated, t), grace: formatSpan(record.grace, t) }) },
            { label: t("devices.last_contact"), value: record.lastSeen ? formatWhen(record.lastSeen, t, i18n.language) : "–" },
          ]}
        />
      </div>
    </>
  );
}
