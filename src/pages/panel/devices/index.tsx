import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import PanelPage from "@/layouts/panel";
import { Cpu } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { DeviceHeader } from "./device-header";
import { DataList, type ListColumn } from "@/components/data-list";
import PumpList from "./pump-list";
import sensorService, {
  type SensorHistoryEntry,
  sensorType,
} from "@/api/services/sensor-service";
import {
  formatSpan,
  sensorActive,
  sensorBlob,
  sensorEndedAt,
  sensorRatedMs,
  sensorStart,
  sensorWornMs,
  uniqueSensors,
} from "@/lib/sensor";

export default function DevicesPage() {
  const { t } = useTranslation();
  const { view } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["sensor-history"],
    queryFn: sensorService.history,
  });

  // Newest session first. Sorted by the real start, not `registered_at` — a
  // sensor restored onto a new install registers late and would jump the queue.
  const sensors = useMemo(
    () =>
      uniqueSensors(data?.sensors ?? []).sort(
        (first, second) => sensorStart(second) - sensorStart(first),
      ),
    [data],
  );

  const columns = useMemo<ListColumn<SensorHistoryEntry>[]>(
    () => [
      {
        header: t("devices.col_sensor"),
        cell: (sensor) => sensorType(sensor.data),
      },
      {
        header: t("devices.col_code"),
        cell: (sensor) => sensorBlob(sensor).pairing_code || "—",
      },
      {
        header: t("devices.col_started"),
        cell: (sensor) => format(new Date(sensorStart(sensor)), "dd.MM.yyyy HH:mm"),
      },
      {
        header: t("devices.col_expires"),
        cell: (sensor) => format(new Date(sensor.expires_at), "dd.MM.yyyy HH:mm"),
      },
      {
        header: t("devices.col_runtime"),
        cell: (sensor) => formatSpan(sensorWornMs(sensor, sensors), t),
      },
      {
        header: t("devices.col_status"),
        cell: (sensor) => {
          const active = sensorActive(sensor, sensors);
          // An expiry the sensor never reached means it was swapped out early,
          // which reads differently from simply running out.
          const early =
            !active && (sensorEndedAt(sensor, sensors) ?? 0) < sensor.expires_at;
          const color = active
            ? "var(--glucose-in-range)"
            : "var(--muted-foreground)";
          const label = active
            ? t("devices.active")
            : early
              ? t("devices.replaced")
              : t("devices.expired");
          return <StatusChip color={color}>{label}</StatusChip>;
        },
      },
    ],
    [t, sensors],
  );

  return (
    <PanelPage
      title={view === "pump" ? t("nav.pump") : t("nav.sensor")}
      parents={[{ title: t("nav.devices") }]}
    >
      <PageHeader title={view === "pump" ? t("nav.pump") : t("nav.sensor")} />
      {view === "pump" ? (
        <PumpList />
      ) : (
        <>
          <SensorHeader sensors={sensors} />
          <DataList
            title={t("devices.sensors")}
            columns={columns}
            data={sensors}
            isLoading={isLoading}
            pageSize={25}
            onRowClick={(sensor) => navigate(`/devices/sensor/${sensor.id}`)}
          />
        </>
      )}
    </PanelPage>
  );
}

/** The sensor in use, with how much of its rated life is worn. */
function SensorHeader({ sensors }: { sensors: SensorHistoryEntry[] }) {
  const { t } = useTranslation();
  const current = sensors.find((sensor) => sensorActive(sensor, sensors));
  if (!current) {
    return (
      <DeviceHeader icon={<Cpu />} name={t("nav.sensor")} status={t("devices.no_active_sensor")} connected={false} bars={[]} />
    );
  }
  const worn = sensorWornMs(current, sensors);
  const rated = sensorRatedMs(current);
  return (
    <DeviceHeader
      icon={<Cpu />}
      name={sensorType(current.data)}
      status={t("devices.active")}
      connected
      bars={[
        {
          label: t("devices.worn_so_far"),
          value: `${formatSpan(worn, t)} / ${formatSpan(rated, t)}`,
          fraction: rated > 0 ? worn / rated : 0,
        },
      ]}
    />
  );
}
