import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Utensils } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/segmented";
import { JumpToDate } from "@/components/scroll-pane";
import { TimelineList } from "@/components/timeline-list";
import { todayRows } from "../overview/today";
import { classify, statusColorVar, toDisplay, unitLabel } from "@/lib/glucose";
import { formatAmount } from "@/lib/nutrition";
import { formatNumber } from "@/lib/format";
import type { Meal } from "@/api/services/nutrition-service";
import { dailyBuckets, topCounts } from "./daily";
import { TodayCard, WeekCard } from "./side-cards";

type MealFilter = "all" | "carbs" | "bolus";

const COLUMNS = "flex shrink-0 items-center text-right";

/** The meals as a timeline with aligned KH · Bolus · Glukose columns, beside today's figures and the week. */
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
  const [filter, setFilter] = useState<MealFilter>("all");
  const [jumpTo, setJumpTo] = useState<number>();
  const sorted = meals.slice().sort((left, right) => right.time - left.time);
  const shown = sorted.filter((meal) => {
    if (filter === "carbs") {
      return (meal.carbs ?? 0) > 0;
    }
    if (filter === "bolus") {
      return !meal.carbs && (meal.bolus ?? 0) > 0;
    }
    return true;
  });
  const today = todayRows(sorted, (meal) => meal.time);
  const carbs = today.reduce((sum, meal) => sum + (meal.carbs ?? 0), 0);
  const bolus = today.reduce((sum, meal) => sum + (meal.bolus ?? 0), 0);
  const insulin = t("nutrition.unit_insulin");
  const glucoseUnit = unitLabel(unit);

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
      <Card className="gap-0 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="flex-1 text-lg font-extrabold">
            {t("nutrition.meals")}
            <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(sorted.length)}</span>
          </h2>
          <JumpToDate onPick={setJumpTo} />
          <Segmented
            label={t("nutrition.meals")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("nutrition.filter_all") },
              { value: "carbs", label: t("nutrition.filter_carbs") },
              { value: "bolus", label: t("nutrition.filter_bolus") },
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data_available")}</p>
        ) : (
          <TimelineList
            jumpTo={jumpTo}
            countLabel={(count) => t("nutrition.count_meals", { count })}
            columns={
              <div className={`${COLUMNS} justify-end gap-0 text-[11px] text-label`}>
                <span className="w-20">{t("nutrition.col_carbs_short")}</span>
                <span className="w-20">{t("nutrition.col_bolus")}</span>
                <span className="w-28">{t("nutrition.col_glucose")}</span>
              </div>
            }
            items={shown.map((meal) => {
              const names = (meal.entries ?? []).map((entry) => entry.name);
              return {
                key: String(meal.time),
                time: meal.time,
                color: "var(--brand)",
                icon: <Utensils />,
                title: names.length ? names.join(" + ") : t("nutrition.manual_entry"),
                to: `/nutrition/meals/${meal.time}`,
                aside: (
                  <span className={COLUMNS}>
                    <span className="w-20 whitespace-nowrap">
                      <b className="text-[15px] font-extrabold">{formatAmount(meal.carbs ?? 0)}</b>{" "}
                      <span className="text-xs text-muted-foreground">g</span>
                    </span>
                    <b className="w-20 text-sm whitespace-nowrap text-teal">
                      {meal.bolus != null ? `${formatNumber(meal.bolus, 1)} ${insulin}` : "–"}
                    </b>
                    <span className="flex w-28 items-center justify-end gap-1.5 text-[13px] whitespace-nowrap text-muted-foreground">
                      {meal.glucose != null ? (
                        <>
                          <i
                            aria-hidden
                            className="block size-2 rounded-full"
                            style={{ backgroundColor: statusColorVar[classify(meal.glucose, low, high)] }}
                          />
                          {toDisplay(meal.glucose, unit)} {glucoseUnit}
                        </>
                      ) : (
                        "–"
                      )}
                    </span>
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
            { label: t("overview.bolus"), value: formatNumber(bolus, 1), unit: insulin, color: "var(--teal)" },
            { label: t("overview.meals"), value: String(today.length) },
            { label: t("nutrition.per_meal"), value: today.length ? formatAmount(Math.round(carbs / today.length)) : "–", unit: "g" },
          ]}
        />
        <WeekCard
          className="flex-1"
          title={t("nutrition.carbs_week")}
          days={dailyBuckets(sorted, (meal) => meal.time, (meal) => meal.carbs ?? 0)}
          formatValue={(value) => `${formatAmount(value)} g`}
          frequentTitle={t("nutrition.frequent_meals")}
          frequent={topCounts(sorted.flatMap((meal) => (meal.entries ?? []).map((entry) => entry.name)))}
        />
      </div>
    </div>
  );
}
