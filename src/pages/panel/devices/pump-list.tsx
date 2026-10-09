import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DataList, type ListColumn } from "@/components/data-list";
import pumpService, {
  type PumpHistoryEntry,
  pumpType,
} from "@/api/services/pump-service";
import {
  podActive,
  podEndedAt,
  podInGrace,
  podLotLabel,
  podRatedMs,
  podReservoirUnits,
  podStart,
  podWornMs,
  uniquePods,
} from "@/lib/pump";
import { formatSpan } from "@/lib/sensor";
import type { TFunction } from "i18next";
import { Syringe } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import { formatNumber } from "@/lib/format";
import { DeviceHeader, type DeviceBar } from "./device-header";
import { formatWhen } from "@/lib/when";

/**
 * Every pod the account has recorded, newest first — the pump counterpart to the
 * sensor list, and deliberately the same shape so the two read alike.
 *
 * The reservoir column says "as of the last contact", because that is what it is:
 * the app only mirrors a pod's state when it happens to talk to it, so this is a
 * snapshot and never a live reading. The live figure is in the app.
 */
export default function PumpList() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["pump-history"],
    queryFn: pumpService.history,
  });

  // Sorted by the real activation, not `registered_at` — a pod restored onto a
  // new install registers late and would otherwise jump the queue.
  const pods = useMemo(
    () =>
      uniquePods(data?.pumps ?? []).sort(
        (first, second) => podStart(second) - podStart(first),
      ),
    [data],
  );

  const columns = useMemo<ListColumn<PumpHistoryEntry>[]>(
    () => [
      {
        header: t("devices.col_pump"),
        cell: (pod) => pumpType(pod),
      },
      {
        header: t("devices.col_lot"),
        cell: (pod) => podLotLabel(pod) ?? "–",
      },
      {
        header: t("devices.col_started"),
        cell: (pod) => formatWhen(podStart(pod), t, i18n.language),
      },
      {
        header: t("devices.col_runtime"),
        cell: (pod) => formatSpan(podWornMs(pod, pods), t),
      },
      {
        header: t("devices.col_reservoir"),
        cell: (pod) => {
          const units = podReservoirUnits(pod);
          return units === null
            ? t("devices.reservoir_unknown")
            : t("devices.reservoir_units", { units: formatNumber(units, 2) });
        },
      },
      {
        header: t("devices.col_status"),
        cell: (pod) => <PodStatusBadge pod={pod} pods={pods} />,
      },
    ],
    [t, i18n.language, pods],
  );

  const current = pods.find((pod) => podActive(pod, pods));
  return (
    <>
      {current ? (
        <DeviceHeader
          icon={<Syringe />}
          name={pumpType(current)}
          status={podInGrace(current, pods) ? t("devices.in_grace_short") : t("devices.active")}
          connected
          bars={podBars(current, pods, t)}
        />
      ) : (
        <DeviceHeader icon={<Syringe />} name={t("nav.pump")} status={t("devices.no_active_pod")} connected={false} bars={[]} />
      )}
      <DataList
        title={t("devices.pods")}
        columns={columns}
        data={pods}
        isLoading={isLoading}
        pageSize={25}
        empty={t("devices.no_pump_data")}
      />
    </>
  );
}

/** A pod holds at most 200 U. */
const POD_CAPACITY_UNITS = 200;

/** The running pod's worn time against its rated life, and its reservoir. */
function podBars(pod: PumpHistoryEntry, pods: PumpHistoryEntry[], t: TFunction): DeviceBar[] {
  const worn = podWornMs(pod, pods);
  const rated = podRatedMs(pod);
  const bars: DeviceBar[] = [
    {
      label: t("devices.worn_so_far"),
      value: `${formatSpan(worn, t)} / ${formatSpan(rated, t)}`,
      fraction: rated > 0 ? worn / rated : 0,
    },
  ];
  const units = podReservoirUnits(pod);
  if (units !== null) {
    bars.push({
      label: t("devices.pod_capacity"),
      value: t("devices.reservoir_units", { units: formatNumber(units, 1) }),
      fraction: units / POD_CAPACITY_UNITS,
    });
  }
  return bars;
}

/**
 * Active, in its grace window, replaced early, or run out — the four states worth
 * telling apart. An expiry the pod never reached means it was taken off early,
 * which reads differently from simply running out.
 */
function PodStatusBadge({
  pod,
  pods,
}: {
  pod: PumpHistoryEntry;
  pods: PumpHistoryEntry[];
}) {
  const { t } = useTranslation();
  const active = podActive(pod, pods);
  const grace = podInGrace(pod, pods);
  const early = !active && (podEndedAt(pod, pods) ?? 0) < pod.expires_at;

  const color = grace
    ? "var(--glucose-high)"
    : active
      ? "var(--glucose-in-range)"
      : "var(--muted-foreground)";
  const label = grace
    ? t("devices.in_grace_short")
    : active
      ? t("devices.active")
      : early
        ? t("devices.replaced")
        : t("devices.expired");

  return <StatusChip color={color}>{label}</StatusChip>;
}
