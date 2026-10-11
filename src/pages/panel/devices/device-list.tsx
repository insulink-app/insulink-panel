import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { ScrollPane } from "@/components/scroll-pane";
import { StatusChip } from "@/components/status-chip";
import { useInfinitePaging } from "@/hooks/use-infinite-paging";
import { formatNumber } from "@/lib/format";
import { formatSpan } from "@/lib/sensor";
import { formatWhen } from "@/lib/when";
import { cn } from "@/lib/utils";
import { isRunning, STATUS_COLOR, type DeviceRecord } from "./records";
import { RuntimeSegments } from "./runtime-segments";

const statusKey: Record<DeviceRecord["status"], string> = {
  active: "devices.active",
  grace: "devices.in_grace_short",
  expired: "devices.expired",
  replaced: "devices.replaced",
};

/**
 * Sensors or pods: the one in use and the statistics on the left, every device
 * as a history table on the right. Rows open the device's page. Devices are
 * changed in the app only, so nothing here changes one.
 */
export function DeviceList({
  records,
  icon,
}: {
  records: DeviceRecord[];
  icon: ReactNode;
}) {
  return (
    <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <CurrentDevice
          record={records.find(isRunning)}
          records={records}
          icon={icon}
        />
        <Statistics records={records} />
      </div>
      <History records={records} />
    </div>
  );
}

function CurrentDevice({
  record,
  records,
  icon,
}: {
  record?: DeviceRecord;
  records: DeviceRecord[];
  icon: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const pods = records[0]?.kind === "pod";
  if (!record) {
    return (
      <Card className="flex-row items-center gap-4 p-6">
        <DeviceIcon>{icon}</DeviceIcon>
        <b className="text-lg">
          {t(pods ? "devices.no_current_pod" : "devices.no_current_sensor")}
        </b>
      </Card>
    );
  }
  return (
    <Card className="gap-0 p-6">
      <div className="flex items-center gap-4">
        <DeviceIcon>{icon}</DeviceIcon>
        <span className="min-w-0">
          <h2 className="truncate text-2xl font-extrabold">{record.name}</h2>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <i
              aria-hidden
              className="block size-[7px] rounded-full"
              style={{ backgroundColor: STATUS_COLOR[record.status] }}
            />
            {t("devices.status_since", {
              status: t(statusKey[record.status]),
              when: formatWhen(record.start, t, i18n.language),
            })}
          </span>
        </span>
      </div>
      <div className="mt-6 mb-2.5 flex justify-between text-sm">
        <span className="text-muted-foreground">{t("devices.runtime")}</span>
        <b>
          {t("devices.runtime_of", {
            worn: formatSpan(record.worn, t),
            rated: formatSpan(record.rated, t),
          })}
        </b>
      </div>
      <RuntimeSegments record={record} />
      <div className="mt-6 grid grid-cols-2 border-t border-divider pt-5">
        {pods ? (
          <Figure
            label={t("devices.pod_capacity")}
            value={
              record.reservoir != null ? formatNumber(record.reservoir, 1) : "–"
            }
            unit={t("nutrition.unit_insulin")}
          />
        ) : (
          <Figure label={t("devices.code")} value={record.code ?? "–"} />
        )}
        <Figure
          label={t("devices.runs_until")}
          value={format(new Date(record.expires), "dd.MM.")}
          unit={format(new Date(record.expires), "HH:mm")}
          divided
        />
      </div>
    </Card>
  );
}

/** Over the devices that came off: how long they ran, how many went early, what was left. */
function Statistics({ records }: { records: DeviceRecord[] }) {
  const { t } = useTranslation();
  const done = records.filter((record) => !isRunning(record));
  const pods = records[0]?.kind === "pod";
  const average = done.length
    ? done.reduce((sum, record) => sum + record.worn, 0) / done.length
    : 0;
  const early = done.filter((record) => record.status === "replaced").length;
  const rests = done
    .map((record) => record.reservoir)
    .filter((rest): rest is number => rest != null);
  const types = [...new Set(records.map((record) => record.name))];
  const figures = pods
    ? [
        { label: t("devices.avg_runtime"), value: formatSpan(average, t) },
        {
          label: t("devices.avg_rest"),
          value: rests.length
            ? formatNumber(
                rests.reduce((sum, rest) => sum + rest, 0) / rests.length,
                1,
              )
            : "–",
          unit: t("nutrition.unit_insulin"),
        },
        {
          label: t("devices.ran_to_end"),
          value: String(done.length - early),
          unit: t("devices.of_count", { count: done.length }),
        },
        {
          label: t("devices.changed_early"),
          value: String(early),
          unit: t("devices.of_count", { count: done.length }),
        },
      ]
    : [
        { label: t("devices.avg_runtime"), value: formatSpan(average, t) },
        {
          label: t("devices.changed_early"),
          value: String(early),
          unit: t("devices.of_count", { count: done.length }),
        },
        ...types.map((type) => ({
          label: type,
          value: String(
            records.filter((record) => record.name === type).length,
          ),
        })),
      ];
  return (
    <Card className="flex-1 gap-0 p-6">
      <CardHeading
        title={t("devices.stats")}
        action={
          <span className="text-xs text-muted-foreground">
            {t(pods ? "devices.all_pods" : "devices.all_sensors", {
              count: records.length,
            })}
          </span>
        }
      />
      <div className="mt-4 grid grid-cols-2 gap-y-5">
        {figures.map((figure, index) => (
          <Figure key={figure.label} {...figure} divided={index % 2 === 1} />
        ))}
      </div>
    </Card>
  );
}

function History({ records }: { records: DeviceRecord[] }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const paging = useInfinitePaging(records.map((record) => record.start));
  const pods = records[0]?.kind === "pod";
  const grid = pods
    ? "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.6fr)_112px] items-center gap-4"
    : "grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_112px] items-center gap-4";
  const longest = Math.max(
    1,
    ...records.map((record) => record.rated + record.grace),
  );
  return (
    <Card className="gap-0 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-lg font-extrabold">
          {t("devices.history")}
          <span className="ml-2 text-[13px] font-bold text-muted-foreground">
            {t(pods ? "devices.count_pods" : "devices.count_sensors", {
              count: records.length,
            })}
          </span>
        </h2>
        {pods ? (
          <span className="text-xs text-muted-foreground">
            {t("devices.rest_hint")}
          </span>
        ) : (
          <span className="flex gap-4 text-xs text-muted-foreground">
            <Legend
              color={STATUS_COLOR.expired}
              label={t("devices.legend_expired")}
            />
            <Legend
              color={STATUS_COLOR.replaced}
              label={t("devices.legend_replaced")}
            />
          </span>
        )}
      </div>
      <ScrollPane
        className="mt-3"
        onNearEnd={paging.loadMore}
        hasMore={paging.hasMore}
        loaded={paging.visible}
        minHeight={520}
        header={
          <div className={`${grid} text-[11px] font-bold text-label`}>
            <span>{pods ? t("devices.col_pod") : t("devices.col_sensor")}</span>
            <span>
              {pods ? t("devices.col_started") : t("devices.col_period")}
            </span>
            <span>{t("devices.col_runtime")}</span>
            {pods && (
              <span className="text-right">{t("devices.col_rest")}</span>
            )}
            <span className="text-right">{t("devices.col_status")}</span>
          </div>
        }
      >
        <ul className="divide-y divide-divider border-t border-divider">
          {records.slice(0, paging.visible).map((record) => (
            <li key={record.id}>
              <button
                type="button"
                onClick={() =>
                  navigate(`/devices/${pods ? "pump" : "sensor"}/${record.id}`)
                }
                className={`${grid} w-full py-3.5 text-left text-sm transition-colors hover:bg-raised/50`}
              >
                <span className="min-w-0">
                  <b className="block truncate">{record.name}</b>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {pods
                      ? [record.lot, record.code]
                          .filter((part) => part !== undefined)
                          .join(" / ") || "–"
                      : (record.code ?? "–")}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate">
                    {formatWhen(record.start, t, i18n.language)}
                  </span>
                  {!pods && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {t("devices.until", {
                        when: formatWhen(
                          record.end ?? record.expires,
                          t,
                          i18n.language,
                        ),
                      })}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-1.5 min-w-0 flex-1 rounded-full bg-ground"
                    aria-hidden
                  >
                    <i
                      className="block h-full min-w-1 rounded-full"
                      style={{
                        width: `${(record.worn / longest) * 100}%`,
                        backgroundColor: STATUS_COLOR[record.status],
                      }}
                    />
                  </span>
                  <b className="w-[92px] shrink-0 whitespace-nowrap">
                    {formatSpan(record.worn, t)}
                  </b>
                </span>
                {pods && (
                  <b
                    className={cn(
                      "text-right whitespace-nowrap",
                      record.reservoir == null &&
                        "font-normal text-muted-foreground",
                    )}
                  >
                    {record.reservoir != null
                      ? `${formatNumber(record.reservoir, 2)} ${t("nutrition.unit_insulin")}`
                      : t("devices.reservoir_unknown")}
                  </b>
                )}
                <span className="text-right">
                  <StatusChip color={STATUS_COLOR[record.status]}>
                    {t(statusKey[record.status])}
                  </StatusChip>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ScrollPane>
    </Card>
  );
}

function DeviceIcon({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand/12 text-brand [&_svg]:size-6">
      {children}
    </span>
  );
}

function Figure({
  label,
  value,
  unit,
  divided,
}: {
  label: string;
  value: string;
  unit?: string;
  divided?: boolean;
}) {
  return (
    <span className={cn("min-w-0", divided && "border-l border-divider pl-5")}>
      <span className="block truncate text-[13px] text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block whitespace-nowrap">
        <b className="text-[26px] font-extrabold">{value}</b>
        {unit && (
          <span className="text-[13px] font-bold text-muted-foreground">
            {" "}
            {unit}
          </span>
        )}
      </span>
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i
        aria-hidden
        className="block size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
