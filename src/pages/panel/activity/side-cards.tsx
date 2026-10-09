import { useTranslation } from "react-i18next";
import { endOfWeek, format, isToday, startOfWeek } from "date-fns";
import { Bike, Dumbbell, Footprints, Zap } from "@/components/icons";
import type { LucideIcon } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import type { CardioType } from "@/api/services/sport-service";
import { formatNumber } from "@/lib/format";
import { dateLocale } from "@/lib/when";
import { heatmapDays, itemDurationMs, type ActivityItem } from "./items";

export const CARDIO_ICON: Record<CardioType, LucideIcon> = { walk: Footprints, jog: Zap, bike: Bike };

/** This week's count, active time, sets and distance as a 2×2 grid. */
export function WeekCard({ items }: { items: ActivityItem[] }) {
  const { t } = useTranslation();
  const from = startOfWeek(new Date(), { weekStartsOn: 1 });
  const to = endOfWeek(new Date(), { weekStartsOn: 1 });
  const week = items.filter((item) => item.at >= from.getTime() && item.at <= to.getTime());
  const minutes = Math.round(week.reduce((sum, item) => sum + itemDurationMs(item), 0) / 60000);
  const sets = week.reduce((sum, item) => sum + (item.kind === "workout" ? item.data.sets.length : 0), 0);
  const km = week.reduce((sum, item) => sum + (item.kind === "training" ? item.data.dist : 0), 0) / 1000;
  const cells = [
    { label: t("activity.activities"), value: String(week.length) },
    { label: t("activity.active_time"), value: formatNumber(minutes), unit: t("overview.unit_min") },
    { label: t("activity.sets"), value: String(sets) },
    { label: t("activity.distance"), value: formatNumber(km, 2), unit: t("body.km") },
  ];
  return (
    <Card className="gap-0 p-6">
      <CardHeading
        title={t("activity.this_week")}
        action={<span className="text-[13px] text-muted-foreground">{`${format(from, "dd.")}–${format(to, "dd.MM.")}`}</span>}
      />
      <div className="mt-4 grid grid-cols-2 gap-y-5">
        {cells.map((cell, index) => (
          <div key={cell.label} className={index % 2 === 1 ? "border-l border-divider pl-5" : ""}>
            <span className="text-[13px] text-muted-foreground">{cell.label}</span>
            <span className="mt-1 block">
              <b className="text-[26px] font-extrabold">{cell.value}</b>
              {cell.unit && <span className="text-[13px] font-bold text-muted-foreground"> {cell.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

const SHADES = ["var(--ground)", "color-mix(in srgb, var(--brand) 30%, transparent)", "color-mix(in srgb, var(--brand) 60%, transparent)", "var(--brand)"];

/** The last five weeks as a Monday-first calendar, brighter for more activity. */
export function HeatmapCard({ items }: { items: ActivityItem[] }) {
  const { t, i18n } = useTranslation();
  const days = heatmapDays(items);
  const locale = dateLocale(i18n.language);
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("activity.last_weeks")} />
      <div className="mt-4 grid grid-cols-7 gap-2 text-center">
        {days.slice(0, 7).map((day) => (
          <span key={`label-${day.day}`} className="text-[11px] text-label">
            {format(new Date(day.day), "EEEEEE", { locale })}
          </span>
        ))}
        {days.map((day) => (
          <i
            key={day.day}
            title={`${format(new Date(day.day), "dd.MM.")} · ${t("activity.count", { count: day.count })}`}
            className={`block h-[34px] rounded-[9px] ${isToday(day.day) ? "ring-2 ring-foreground ring-inset" : ""} ${day.future ? "border border-dashed border-divider" : ""}`}
            style={{ backgroundColor: day.future ? "transparent" : SHADES[Math.min(3, day.count)] }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        {t("activity.less")}
        {SHADES.map((shade) => (
          <i key={shade} className="block size-2.5 rounded-[3px]" style={{ backgroundColor: shade }} />
        ))}
        {t("activity.more")}
      </div>
    </Card>
  );
}

/** The last 30 days by kind: count (and distance for cardio) with a bar. */
export function KindsCard({ items, className }: { items: ActivityItem[]; className?: string }) {
  const { t } = useTranslation();
  const recent = items.filter((item) => item.at >= Date.now() - 30 * 24 * 3_600_000);
  const workouts = recent.filter((item) => item.kind === "workout").length;
  const cardio = (["walk", "jog", "bike"] as CardioType[]).map((type) => {
    const runs = recent.filter((item) => item.kind === "training" && item.data.type === type);
    return { type, count: runs.length, km: runs.reduce((sum, item) => sum + (item.kind === "training" ? item.data.dist : 0), 0) / 1000 };
  });
  const rows = [
    { key: "workout", Icon: Dumbbell, title: t("activity.filter_workout"), detail: t("activity.sessions", { n: workouts }), count: workouts },
    ...cardio
      .filter((kind) => kind.count > 0)
      .map((kind) => ({
        key: kind.type,
        Icon: CARDIO_ICON[kind.type],
        title: t("activity.type_" + kind.type),
        detail: t("activity.trainings_km", { n: kind.count, km: formatNumber(kind.km, 1) }),
        count: kind.count,
      })),
  ];
  const top = Math.max(1, ...rows.map((row) => row.count));
  return (
    <Card className={`gap-0 p-6 ${className ?? ""}`}>
      <CardHeading title={t("activity.by_kind")} />
      <div className="mt-2 divide-y divide-divider">
        {rows.map(({ key, Icon, title, detail, count }) => (
          <div key={key} className="flex items-center gap-3.5 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
              <Icon size={17} />
            </span>
            <span className="w-28 shrink-0">
              <b className="block text-sm">{title}</b>
              <span className="text-xs text-muted-foreground">{detail}</span>
            </span>
            <span className="block h-1.5 flex-1 overflow-hidden rounded-[3px] bg-ground" aria-hidden>
              <i className="block h-full rounded-[3px] bg-primary" style={{ width: `${(count / top) * 100}%` }} />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
