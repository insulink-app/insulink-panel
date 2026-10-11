import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { PeriodBars } from "@/components/period-bars";
import { formatWeekday } from "@/lib/when";

export interface Figure {
  label: string;
  value: string;
  unit?: string;
  /** The value's colour (bolus in teal); the text colour otherwise. */
  color?: string;
}

/** Today's figures as a 2×2 grid, or whatever the page puts there instead. */
export function TodayCard({ figures, children }: { figures?: Figure[]; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("nutrition.today")} />
      {figures && (
        <div className="mt-4 grid grid-cols-2 gap-y-[18px]">
          {figures.map((figure, index) => (
            <div key={figure.label} className={index % 2 === 1 ? "border-l border-divider pl-[18px]" : ""}>
              <span className="text-[13px] text-muted-foreground">{figure.label}</span>
              <span className="mt-1 block whitespace-nowrap">
                <b className="text-2xl font-extrabold" style={{ color: figure.color }}>
                  {figure.value}
                </b>
                {figure.unit && <span className="text-[13px] font-bold text-muted-foreground"> {figure.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {children}
    </Card>
  );
}

/**
 * The last seven days as bars, today in the brand colour (or `color`), with
 * the average or a goal as a dashed line; below it, what was logged most often.
 */
export function WeekCard({
  title,
  days,
  formatValue,
  line,
  color,
  frequentTitle,
  frequent,
  className,
}: {
  title: string;
  days: { time: number; value: number }[];
  formatValue: (value: number) => string;
  line?: { value: number; label: string };
  color?: string;
  frequentTitle: string;
  frequent: { label: string; count: number }[];
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const most = Math.max(1, ...frequent.map((entry) => entry.count));
  return (
    <Card className={`gap-0 p-6 ${className ?? ""}`}>
      <CardHeading title={title} />
      <div className="mt-5">
        <PeriodBars
          data={days}
          height={180}
          averageLabel={(average) => `Ø ${average}`}
          formatValue={formatValue}
          line={line}
          color={color}
          tickLabel={(time) => formatWeekday(time, t, i18n.language)}
        />
      </div>
      {frequent.length > 0 && (
        <div className="mt-5 border-t border-divider pt-5">
          <CardHeading title={frequentTitle} />
          <ul className="mt-2 divide-y divide-divider">
            {frequent.map((entry) => (
              <li key={entry.label} className="flex items-center gap-4 py-2.5">
                <b className="min-w-0 flex-1 truncate text-sm">{entry.label}</b>
                <span className="h-1.5 w-[120px] shrink-0 rounded-full bg-ground" aria-hidden>
                  <i className="block h-full rounded-full bg-brand" style={{ width: `${(entry.count / most) * 100}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{entry.count}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
