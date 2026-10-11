import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Activity, Heart } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { KpiStrip } from "@/components/kpi-strip";
import type { HealthDay } from "@/api/services/health-service";
import { Hypnogram } from "./hypnogram";
import { PHASES, PHASE_COLOR, formatHoursMinutes, hoursMinutes, phaseMinutes } from "./sleep";

/** The selected night: its length, the phases and the hypnogram. */
export function NightCard({ night }: { night: HealthDay }) {
  const { t } = useTranslation();
  const minutes = phaseMinutes(night);
  const total = hoursMinutes(night.sleep);
  const segments = night.tl ?? [];
  const from = segments.length ? Math.min(...segments.map((segment) => segment.a)) : null;
  const to = segments.length ? Math.max(...segments.map((segment) => segment.b)) : null;
  return (
    <Card className="gap-0 p-6">
      <span className="text-sm text-muted-foreground">
        {from != null && to != null
          ? t("sleep.slept", { from: format(new Date(from), "HH:mm"), to: format(new Date(to), "HH:mm") })
          : t("sleep.total")}
      </span>
      {total && (
        <div className="mt-1">
          {total.hours > 0 && (
            <>
              <b className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">{total.hours}</b>
              <span className="text-[22px] font-bold text-muted-foreground"> {t("sleep.unit_h")} </span>
            </>
          )}
          <b className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">{total.minutes}</b>
          <span className="text-[22px] font-bold text-muted-foreground"> {t("sleep.unit_min")}</span>
        </div>
      )}
      <div className="mt-[22px]">
        <KpiStrip
          cells={PHASES.map((phase) => ({
            label: t("sleep.stage_" + phase),
            value: formatHoursMinutes(minutes[phase], t("sleep.unit_h")),
            unit: t("sleep.unit_min"),
            dot: PHASE_COLOR[phase],
          }))}
        />
      </div>
      {segments.length > 0 && (
        <div className="mt-7">
          <Hypnogram segments={segments} />
        </div>
      )}
    </Card>
  );
}

/** The night's resting pulse and breathing, then its phases as shares. */
export function NightSideCard({ night }: { night: HealthDay }) {
  const { t } = useTranslation();
  const minutes = phaseMinutes(night);
  const total = Math.max(1, PHASES.reduce((sum, phase) => sum + minutes[phase], 0));
  const vitals = [
    night.rhr != null && { icon: <Heart size={17} />, title: t("sleep.resting_hr"), detail: t("sleep.resting_min"), value: `${night.rhr} ${t("sleep.bpm")}` },
    night.rr != null && { icon: <Activity size={17} />, title: t("sleep.respiratory_full"), detail: t("sleep.respiratory_avg"), value: `${night.rr} ${t("sleep.per_min")}` },
  ].filter((row) => row !== false);
  return (
    <Card className="h-full gap-0 p-6">
      <CardHeading title={t("sleep.this_night")} />
      <div className="mt-2 divide-y divide-divider">
        {vitals.map((row) => (
          <div key={row.title} className="flex items-center gap-3 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">{row.icon}</span>
            <span className="min-w-0 flex-1">
              <b className="block text-sm">{row.title}</b>
              <span className="text-xs text-muted-foreground">{row.detail}</span>
            </span>
            <b className="text-sm">{row.value}</b>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-divider pt-6">
        <CardHeading title={t("sleep.phase_shares")} />
        <div className="mt-4 flex h-3.5 gap-1" aria-hidden>
          {PHASES.filter((phase) => minutes[phase] > 0).map((phase) => (
            <i key={phase} className="block rounded-md" style={{ flexGrow: minutes[phase], backgroundColor: PHASE_COLOR[phase] }} />
          ))}
        </div>
        <div className="mt-3 divide-y divide-divider">
          {PHASES.map((phase) => (
            <div key={phase} className="flex items-center gap-2.5 py-2.5 text-sm">
              <i className="block size-2 rounded-full" style={{ backgroundColor: PHASE_COLOR[phase] }} />
              <span className="flex-1">{t("sleep.stage_" + phase)}</span>
              <b>{Math.round((minutes[phase] / total) * 100)} %</b>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
