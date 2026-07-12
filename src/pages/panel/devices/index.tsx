import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList, type ListColumn } from "@/components/data-list";
import sensorService, {
  type SensorHistoryEntry,
  sensorType,
} from "@/api/services/sensor-service";

export default function DevicesPage() {
  const { t } = useTranslation();
  const { view } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["sensor-history"],
    queryFn: sensorService.history,
  });

  const sensors = useMemo(
    () =>
      (data?.sensors ?? [])
        .slice()
        .sort((a, b) => b.registered_at - a.registered_at),
    [data],
  );

  const columns = useMemo<ListColumn<SensorHistoryEntry>[]>(
    () => [
      { header: t("devices.col_sensor"), cell: (s) => sensorType(s.data) },
      {
        header: t("devices.col_registered"),
        cell: (s) => format(new Date(s.registered_at), "dd.MM.yyyy HH:mm"),
      },
      {
        header: t("devices.col_expires"),
        cell: (s) => format(new Date(s.expires_at), "dd.MM.yyyy HH:mm"),
      },
      {
        header: t("devices.col_lifetime"),
        cell: (s) => {
          const days =
            (s.expires_at - s.registered_at) / (1000 * 60 * 60 * 24);
          return t("devices.days", { n: Math.round(days) });
        },
      },
      {
        header: t("devices.col_status"),
        cell: (s) => {
          const active = s.expires_at > Date.now();
          const color = active
            ? "var(--glucose-in-range)"
            : "var(--muted-foreground)";
          return (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
            >
              {active ? t("devices.active") : t("devices.expired")}
            </span>
          );
        },
      },
    ],
    [t],
  );

  return (
    <PanelPage title={t("devices.title")}>
      <div className="py-6">
        {view === "pump" ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("devices.pump")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("devices.no_pump_data")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <DataList
            title={t("devices.sensors")}
            columns={columns}
            data={sensors}
            isLoading={isLoading}
            pageSize={25}
            onRowClick={(s) => navigate(`/devices/sensor/${s.id}`)}
          />
        )}
      </div>
    </PanelPage>
  );
}
