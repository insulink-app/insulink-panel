import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Cpu } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { StatusChip } from "@/components/status-chip";
import sensorService, { sensorType } from "@/api/services/sensor-service";
import { formatSpan, sensorActive, sensorRatedMs, sensorStart } from "@/lib/sensor";
import { formatWhen } from "@/lib/when";

const SEGMENTS = 10;

/**
 * The sensor in use: its type, when it started, and how much of its life is
 * left as ten segments, the remaining ones in the brand colour from the left.
 */
export function SensorCard({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { data } = useQuery({ queryKey: ["sensor-history"], queryFn: sensorService.history });
  const sensors = data?.sensors ?? [];
  const current = sensors.find((sensor) => sensorActive(sensor, sensors));
  const remaining = current ? Math.max(0, current.expires_at - Date.now()) : 0;
  const rated = current ? sensorRatedMs(current) : 0;
  const left = rated > 0 ? Math.round(Math.min(1, remaining / rated) * SEGMENTS) : 0;

  return (
    <Card className={`gap-0 p-6 ${className ?? ""}`}>
      <div className="mb-4">
        <CardHeading
          title={t("nav.sensor")}
          action={
            <StatusChip color={current ? "var(--range)" : "var(--text-muted)"}>
              {current ? t("devices.connected") : t("devices.disconnected")}
            </StatusChip>
          }
        />
      </div>
      {current ? (
        <>
          <div className="flex items-center gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
              <Cpu size={20} />
            </span>
            <span className="min-w-0">
              <b className="block text-base">{sensorType(current.data)}</b>
              <span className="text-[13px] text-muted-foreground">
                {t("devices.started_at", { when: formatWhen(sensorStart(current), t, i18n.language) })}
              </span>
            </span>
          </div>
          <div className="mt-[18px] mb-2 flex justify-between text-[13px]">
            <span className="text-muted-foreground">{t("devices.col_runtime")}</span>
            <b>{t("devices.remaining_short", { span: formatSpan(remaining, t) })}</b>
          </div>
          <div
            className="flex gap-[3px]"
            role="progressbar"
            aria-label={t("devices.col_runtime")}
            aria-valuemin={0}
            aria-valuemax={SEGMENTS}
            aria-valuenow={left}
          >
            {Array.from({ length: SEGMENTS }, (_, index) => (
              <i
                key={index}
                className={`block h-2 flex-1 rounded ${index < left ? "bg-primary" : "bg-divider"}`}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("devices.no_active_sensor")}</p>
      )}
    </Card>
  );
}
