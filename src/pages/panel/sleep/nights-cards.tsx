import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { Segmented } from "@/components/segmented";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { BAR_FILL, BAR_FILL_CURRENT, BAR_STYLE, CHART_MARGIN_TIGHT, X_AXIS_STYLE, thresholdLabel } from "@/components/chart-kit";
import type { HealthDay } from "@/api/services/health-service";
import { formatDay } from "@/lib/when";
import { differenceInCalendarDays, format } from "date-fns";
import type { TFunction } from "i18next";
import { PHASES, PHASE_COLOR, formatHoursMinutes, phaseMinutes } from "./sleep";

type Span = 14 | 30 | 90;

/** Sleep per night as bars, the latest in the brand colour, with the average. */
export function DurationCard({ nights }: { nights: HealthDay[] }) {
  const { t, i18n } = useTranslation();
  const [span, setSpan] = useState<Span>(14);
  const shown = nights.slice(0, span).reverse().map((night) => ({ d: night.d, minutes: night.sleep ?? 0 }));
  const average = shown.reduce((sum, night) => sum + night.minutes, 0) / Math.max(1, shown.length);
  const hour = t("sleep.unit_h");
  return (
    <Card className="gap-0 p-6">
      <CardHeading
        title={`${t("sleep.duration")} · ${t("sleep.nights_span", { n: shown.length })}`}
        action={
          <Segmented
            label={t("overview.range")}
            value={span}
            onChange={setSpan}
            options={([14, 30, 90] as Span[]).map((value) => ({ value, label: t("sleep.nights_span", { n: value }) }))}
          />
        }
      />
      <div className="mt-6">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={shown} margin={{ ...CHART_MARGIN_TIGHT, top: 18, left: 16, right: 16 }} barCategoryGap="22%">
            <XAxis
              {...X_AXIS_STYLE}
              dataKey="d"
              tickFormatter={(value) => axisDay(value, t, i18n.language)}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis hide />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: "var(--raised)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltipBox caption={formatDay(new Date(label as string).getTime(), t, i18n.language)}>
                    <ChartTooltipValue>
                      {formatHoursMinutes(Number(payload[0].value), hour)} {t("sleep.unit_min")}
                    </ChartTooltipValue>
                  </ChartTooltipBox>
                ) : null
              }
            />
            <Bar {...BAR_STYLE} dataKey="minutes">
              {shown.map((night, index) => (
                <Cell key={night.d} fill={index === shown.length - 1 ? BAR_FILL_CURRENT : BAR_FILL} />
              ))}
            </Bar>
            <ReferenceLine
              y={average}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              label={thresholdLabel(t("sleep.average", { value: formatHoursMinutes(Math.round(average), hour) }))}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** The recent nights, each with a mini phase bar; the selected one marked. */
export function NightsList({
  nights,
  selected,
  onSelect,
}: {
  nights: HealthDay[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("sleep.nights")} />
      <div className="mt-3 divide-y divide-divider">
        {nights.slice(0, 8).map((night) => {
          const current = night.d === selected;
          const minutes = phaseMinutes(night);
          return (
            <button
              key={night.d}
              type="button"
              aria-pressed={current}
              onClick={() => onSelect(night.d)}
              className="relative flex w-full items-center gap-4 py-2.5 pl-3.5 text-left transition-opacity hover:opacity-80"
            >
              {current && <i className="absolute top-2.5 bottom-2.5 left-0 block w-[3px] rounded-sm bg-primary" aria-hidden />}
              <b className="w-24 shrink-0 text-[13px]">{formatDay(new Date(night.d).getTime(), t, i18n.language)}</b>
              <span className="flex h-1.5 min-w-0 flex-1 gap-1" aria-hidden>
                {PHASES.filter((phase) => minutes[phase] > 0).map((phase) => (
                  <i key={phase} className="block rounded-[3px]" style={{ flexGrow: minutes[phase], backgroundColor: PHASE_COLOR[phase] }} />
                ))}
              </span>
              <b className="w-14 shrink-0 text-right text-[13px]">{formatHoursMinutes(night.sleep, t("sleep.unit_h"))}</b>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** A short axis date: "Heute"/"Gestern", else the day and month. */
function axisDay(key: string, t: TFunction, language: string) {
  const time = new Date(key).getTime();
  return differenceInCalendarDays(new Date(), time) < 2 ? formatDay(time, t, language) : format(time, "dd.MM.");
}
