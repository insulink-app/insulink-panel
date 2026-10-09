import { useTranslation } from "react-i18next";
import { Utensils } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { TimelineList } from "@/components/timeline-list";
import { todayRows } from "../overview/today";
import { classify, statusColorVar, toDisplay, unitLabel } from "@/lib/glucose";
import { formatAmount, withUnit } from "@/lib/nutrition";
import { formatNumber } from "@/lib/format";
import type { Meal } from "@/api/services/nutrition-service";
import { dailyBuckets } from "./daily";
import { TodayCard, WeekCard } from "./side-cards";

/** The meals as a day-grouped timeline beside today's figures and the week. */
export function MealsView({
  meals,
  low,
  high,
  unit,
}: {
  meals: Meal[];
  low: number;
  high: number;
  unit?: string;
}) {
  const { t } = useTranslation();
  const sorted = meals.slice().sort((left, right) => right.time - left.time);
  const today = todayRows(sorted, (meal) => meal.time);
  const carbs = today.reduce((sum, meal) => sum + (meal.carbs ?? 0), 0);
  const bolus = today.reduce((sum, meal) => sum + (meal.bolus ?? 0), 0);
  const insulin = t("nutrition.unit_insulin");

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
      <Card className="gap-0 p-6">
        <h2 className="mb-4 text-lg font-extrabold">
          {t("nutrition.meals")}
          <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(sorted.length)}</span>
        </h2>
        {sorted.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data_available")}</p>
        ) : (
          <TimelineList
            countLabel={(count) => t("nutrition.count_meals", { count })}
            olderLabel={t("nutrition.older_meals")}
            items={sorted.map((meal) => {
              const entries = meal.entries ?? [];
              const title = entries[0]?.name ?? t("nutrition.manual_entry");
              return {
                key: String(meal.time),
                time: meal.time,
                color: "var(--brand)",
                icon: <Utensils />,
                title: entries.length > 1 ? `${title} +${entries.length - 1}` : title,
                detail: meal.bolus != null ? `${formatNumber(meal.bolus, 1)} ${insulin}` : undefined,
                to: `/nutrition/meals/${meal.time}`,
                aside: (
                  <span className="block text-right">
                    <b className="block text-sm">{withUnit(meal.carbs, "g")}</b>
                    {meal.glucose != null && (
                      <span className="text-xs" style={{ color: statusColorVar[classify(meal.glucose, low, high)] }}>
                        {toDisplay(meal.glucose, unit)} {unitLabel(unit)}
                      </span>
                    )}
                  </span>
                ),
              };
            })}
          />
        )}
      </Card>
      <div className="flex min-w-0 flex-col gap-4">
        <TodayCard
          figures={[
            { label: t("overview.carbs"), value: formatAmount(carbs), unit: "g" },
            { label: t("overview.bolus"), value: formatNumber(bolus, 1), unit: insulin },
            { label: t("overview.meals"), value: String(today.length) },
            { label: t("nutrition.per_meal"), value: today.length ? formatAmount(Math.round(carbs / today.length)) : "–", unit: "g" },
          ]}
        />
        <WeekCard
          className="flex-1"
          title={t("nutrition.carbs_week")}
          days={dailyBuckets(sorted, (meal) => meal.time, (meal) => meal.carbs ?? 0)}
          formatValue={(value) => `${formatAmount(value)} g`}
        />
      </div>
    </div>
  );
}
