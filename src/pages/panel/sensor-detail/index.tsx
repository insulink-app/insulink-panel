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
import sensorService, { sensorType } from "@/api/services/sensor-service";
import glucoseService from "@/api/services/glucose-service";
import { classify } from "@/lib/glucose";

export default function SensorDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const sensors = useQuery({ queryKey: ["sensor-history"], queryFn: sensorService.history });
  const glucose = useQuery({ queryKey: ["glucose-history"], queryFn: glucoseService.history });

  const sensor = sensors.data?.sensors?.find((entry) => entry.id === id);

  // Glucose readings gathered while this sensor was the active one.
  const stats = useMemo(() => {
    if (!sensor) {
      return null;
    }
    const values = (glucose.data?.entries ?? [])
      .filter((entry) => entry.time >= sensor.registered_at && entry.time <= sensor.expires_at)
      .map((entry) => entry.value);
    if (values.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, inRange: 0 };
    }
    const inRange = values.filter((value) => classify(value) === "in-range").length;
    return {
      count: values.length,
      avg: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      inRange: Math.round((inRange / values.length) * 100),
    };
  }, [sensor, glucose.data]);

  const active = sensor ? sensor.expires_at > Date.now() : false;
  const days = sensor
    ? Math.round((sensor.expires_at - sensor.registered_at) / (1000 * 60 * 60 * 24))
    : 0;

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
            <div>
              <h2 className="text-2xl font-bold">{sensorType(sensor.data)}</h2>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  color: active ? "var(--glucose-in-range)" : "var(--muted-foreground)",
                  backgroundColor: `color-mix(in srgb, ${active ? "var(--glucose-in-range)" : "var(--muted-foreground)"} 18%, transparent)`,
                }}
              >
                {active ? t("devices.active") : t("devices.expired")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label={t("devices.col_registered")}
                value={format(new Date(sensor.registered_at), "dd.MM.yyyy HH:mm")}
              />
              <StatTile
                label={t("devices.col_expires")}
                value={format(new Date(sensor.expires_at), "dd.MM.yyyy HH:mm")}
              />
              <StatTile label={t("devices.col_lifetime")} value={t("devices.days", { n: days })} />
              <StatTile label={t("devices.readings")} value={String(stats?.count ?? 0)} />
            </div>

            {stats && stats.count > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("devices.glucose_summary")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile label={t("devices.avg")} value={`${stats.avg} mg/dL`} />
                  <StatTile label={t("devices.min")} value={`${stats.min} mg/dL`} />
                  <StatTile label={t("devices.max")} value={`${stats.max} mg/dL`} />
                  <StatTile label={t("devices.in_range")} value={`${stats.inRange}%`} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PanelPage>
  );
}

