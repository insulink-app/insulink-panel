import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { PeriodBars } from "@/components/period-bars";

export interface Figure {
  label: string;
  value: string;
  unit?: string;
}

/** Today's figures as a 2×2 grid, with whatever extra the page adds below. */
export function TodayCard({ figures, children }: { figures: Figure[]; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("nutrition.today")} />
      <div className="mt-4 grid grid-cols-2 gap-y-[18px]">
        {figures.map((figure, index) => (
          <div key={figure.label} className={index % 2 === 1 ? "border-l border-divider pl-[18px]" : ""}>
            <span className="text-[13px] text-muted-foreground">{figure.label}</span>
            <span className="mt-1 block">
              <b className="text-2xl font-extrabold">{figure.value}</b>
              {figure.unit && <span className="text-[13px] font-bold text-muted-foreground"> {figure.unit}</span>}
            </span>
          </div>
        ))}
      </div>
      {children}
    </Card>
  );
}

/** The last seven days as bars, today in the brand colour. */
export function WeekCard({
  title,
  days,
  formatValue,
  className,
}: {
  title: string;
  days: { time: number; value: number }[];
  formatValue: (value: number) => string;
  className?: string;
}) {
  return (
    <Card className={`gap-0 p-6 ${className ?? ""}`}>
      <CardHeading title={title} />
      <div className="mt-5">
        <PeriodBars data={days} height={200} averageLabel={(avg) => `Ø ${avg}`} formatValue={formatValue} />
      </div>
    </Card>
  );
}
