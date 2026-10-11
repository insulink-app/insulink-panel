import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import { Cpu, Syringe } from "@/components/icons";
import { CardSkeleton } from "@/components/card-skeleton";
import { PageHeader } from "@/components/page-header";
import pumpService from "@/api/services/pump-service";
import sensorService from "@/api/services/sensor-service";
import { DeviceList } from "./device-list";
import { podRecords, sensorRecords } from "./records";

/** The sensor and pump pages: the device in use, statistics and the history. */
export default function DevicesPage() {
  const { t } = useTranslation();
  const pump = useParams().view === "pump";
  const sensors = useQuery({ queryKey: ["sensor-history"], queryFn: sensorService.history, enabled: !pump });
  const pods = useQuery({ queryKey: ["pump-history"], queryFn: pumpService.history, enabled: pump });
  const records = useMemo(
    () => (pump ? podRecords(pods.data?.pumps ?? []) : sensorRecords(sensors.data?.sensors ?? [])),
    [pump, pods.data, sensors.data],
  );
  const title = pump ? t("nav.pump") : t("nav.sensor");
  return (
    <PanelPage title={title} parents={[{ title: t("nav.devices") }]}>
      <PageHeader title={title} />
      {(pump ? pods.isLoading : sensors.isLoading) ? (
        <CardSkeleton />
      ) : (
        <DeviceList records={records} icon={pump ? <Syringe /> : <Cpu />} />
      )}
    </PanelPage>
  );
}
