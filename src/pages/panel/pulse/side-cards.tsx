import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import type { HealthDay, PulseSample } from "@/api/services/health-service";
import { dateLocale } from "@/lib/when";
import { PULSE_ELEVATED, PULSE_HIGH, PULSE_REST, PULSE_ZONES, ZONE_COLOR, zoneOf, type PulseZone } from "./zones";

/** The share of the span in each zone: a stacked bar over the four zones. */
export function ZonesCard({ samples, period }: { samples: PulseSample[]; period: string }) {
  const { t } = useTranslation();
  const counts: Record<PulseZone, number> = { rest: 0, normal: 0, elevated: 0, high: 0 };
  for (const sample of samples) {
    counts[zoneOf(sample.b)]++;
  }
  const percent = (zone: PulseZone) => (samples.length ? (counts[zone] / samples.length) * 100 : 0);
  const range: Record<PulseZone, string> = {
    rest: t("pulse.below", { n: PULSE_REST }),
    normal: t("pulse.between", { from: PULSE_REST, to: PULSE_ELEVATED }),
    elevated: t("pulse.between", { from: PULSE_ELEVATED, to: PULSE_HIGH }),
    high: t("pulse.above", { n: PULSE_HIGH }),
  };
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={`${t("pulse.zones")} · ${period}`} />
      <div className="mt-4 flex h-3 gap-[3px]" aria-hidden>
        {PULSE_ZONES.filter((zone) => percent(zone) > 0).map((zone) => (
          <i key={zone} className="block rounded-md" style={{ flexGrow: percent(zone), backgroundColor: ZONE_COLOR[zone] }} />
        ))}
      </div>
      <div className="mt-3 divide-y divide-divider">
        {PULSE_ZONES.map((zone) => (
          <div key={zone} className="flex items-center gap-2.5 py-3">
            <i className="block size-2 shrink-0 rounded-full" style={{ backgroundColor: ZONE_COLOR[zone] }} />
            <span className="min-w-0 flex-1">
              <b className="block text-sm">{t("pulse.zone_" + zone)}</b>
              <span className="text-xs text-muted-foreground">{range[zone]}</span>
            </span>
            <b className="text-[15px]">{Math.round(percent(zone))} %</b>
          </div>
        ))}
      </div>
    </Card>
  );
}

const BAR_AREA = 120;

/** The resting heart rate of the last seven days as violet bars. */
export function RestingWeekCard({ days, className }: { days: HealthDay[]; className?: string }) {
  const { t, i18n } = useTranslation();
  const week = days
    .filter((day) => day.rhr != null)
    .sort((left, right) => left.d.localeCompare(right.d))
    .slice(-7);
  const top = Math.max(1, ...week.map((day) => day.rhr ?? 0));
  const latest = week[week.length - 1]?.rhr;
  return (
    <Card className={`gap-0 p-6 ${className ?? ""}`}>
      <CardHeading
        title={t("pulse.resting_week")}
        action={
          latest != null && (
            <b className="text-[15px]">
              {latest} <span className="text-[13px] text-muted-foreground">{t("pulse.bpm")}</span>
            </b>
          )
        }
      />
      {week.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">{t("common.no_data")}</p>
      ) : (
        <>
          <div className="mt-4 flex items-end gap-3.5" style={{ height: BAR_AREA }} aria-hidden>
            {week.map((day) => (
              <i
                key={day.d}
                title={`${day.rhr} ${t("pulse.bpm")}`}
                className="block flex-1 rounded-[5px]"
                style={{
                  height: `${((day.rhr ?? 0) / top) * 100}%`,
                  backgroundColor: "color-mix(in srgb, var(--pulse) 45%, transparent)",
                }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex gap-3.5 text-xs text-muted-foreground">
            {week.map((day) => (
              <span key={day.d} className="flex-1 text-center">
                {format(new Date(day.d), "EEE", { locale: dateLocale(i18n.language) })}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
