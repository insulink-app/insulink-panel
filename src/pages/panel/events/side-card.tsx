import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import sensorService, { sensorType } from "@/api/services/sensor-service";
import { categoryOf, hourlyCounts, peakTwoHours } from "@/lib/events";
import { formatSpan, sensorActive, sensorStart } from "@/lib/sensor";
import { formatWhen } from "@/lib/when";
import type { EventEntry } from "@/api/services/event-service";

const BAR_AREA = 170;

/**
 * When in the day the lows fall (24 bars and the busiest two hours in one
 * sentence), then what happened since the current sensor went on.
 */
export function EventsSideCard({ entries, period }: { entries: EventEntry[]; period: string }) {
  const { t, i18n } = useTranslation();
  const lows = entries.filter((entry) => categoryOf(entry.type) === "low");
  const hours = hourlyCounts(lows);
  const top = Math.max(1, ...hours);
  const peak = peakTwoHours(hours);
  const sensors = useQuery({ queryKey: ["sensor-history"], queryFn: sensorService.history }).data?.sensors ?? [];
  const sensor = sensors.find((entry) => sensorActive(entry, sensors));
  const since = sensor ? entries.filter((entry) => entry.time >= sensorStart(sensor)) : [];
  const countOf = (category: string) => since.filter((entry) => categoryOf(entry.type) === category).length;

  return (
    <Card className="h-full gap-0 p-6">
      <CardHeading title={t("events.lows_by_hour")} />
      <p className="mt-2 mb-[18px] text-[13px] text-muted-foreground">
        {t("events.peak_prefix", { period })}{" "}
        {peak != null && <b className="text-foreground">{t("events.peak_hours", { from: peak, to: peak + 2 })}</b>}
      </p>
      <div className="flex items-end gap-[3px]" style={{ height: BAR_AREA }} aria-hidden>
        {hours.map((count, hour) => (
          <i
            key={hour}
            className="block flex-1 rounded-t-[4px]"
            style={{
              height: `${Math.max(2, (count / top) * 100)}%`,
              backgroundColor: "color-mix(in srgb, var(--low) 78%, var(--panel))",
            }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex justify-between text-xs text-muted-foreground">
        {["00", "06", "12", "18", "24"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-[22px] mb-[18px] h-px bg-divider" />
      <CardHeading title={t("events.since_sensor")} />
      {sensor ? (
        <div className="mt-2 divide-y divide-divider">
          <div className="flex items-center gap-3.5 py-2.5">
            <span className="min-w-0 flex-1">
              <b className="block text-sm">{sensorType(sensor.data)}</b>
              <span className="text-xs text-muted-foreground">
                {t("devices.started_at", { when: formatWhen(sensorStart(sensor), t, i18n.language) })}
              </span>
            </span>
            <span className="text-right">
              <b className="text-sm">{formatSpan(Math.max(0, sensor.expires_at - Date.now()), t)}</b>
              <span className="block text-xs text-muted-foreground">{t("events.remaining")}</span>
            </span>
          </div>
          <div className="flex items-center gap-3.5 py-2.5">
            <span className="min-w-0 flex-1">
              <b className="block text-sm">{t("events.events")}</b>
              <span className="text-xs text-muted-foreground">
                {[t("events.category_low"), t("events.category_high"), t("events.filter_signal")].join(" · ")}
              </span>
            </span>
            <b className="text-sm">{[countOf("low"), countOf("high"), countOf("signal")].join(" · ")}</b>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{t("devices.no_active_sensor")}</p>
      )}
    </Card>
  );
}
