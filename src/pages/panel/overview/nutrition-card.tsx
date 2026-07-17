import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Utensils } from "@/components/icons";
import type { Drink, Meal } from "@/api/services/nutrition-service";
import { formatAmount } from "@/lib/nutrition";
import { sumToday, todayRows } from "./today";
import { SectionCard, SectionMetric, SectionRow } from "./section-card";

/** Today's carbs/bolus/drinks, plus the meals logged most recently. */
export function NutritionCard({
  meals,
  drinks,
  isLoading,
}: {
  meals: Meal[];
  drinks: Drink[];
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const mealTime = (meal: Meal) => meal.time;
  const drinkTime = (drink: Drink) => drink.at;

  const carbs = sumToday(meals, mealTime, (meal) => meal.carbs ?? 0);
  const bolus = sumToday(meals, mealTime, (meal) => meal.bolus ?? 0);
  const water = sumToday(drinks, drinkTime, (drink) => drink.ml);

  const recent = meals
    .slice()
    .sort((left, right) => right.time - left.time)
    .slice(0, 3);

  return (
    <SectionCard
      title={t("overview.nutrition_today")}
      to="/nutrition/meals"
      loading={isLoading}
      metrics={
        <>
          <SectionMetric
            label={t("overview.carbs")}
            value={`${formatAmount(carbs)} g`}
            loading={isLoading}
          />
          <SectionMetric
            label={t("overview.bolus")}
            value={`${formatAmount(bolus)} ${t("nutrition.unit_insulin")}`}
            loading={isLoading}
          />
          <SectionMetric
            label={t("overview.meals")}
            value={String(todayRows(meals, mealTime).length)}
            loading={isLoading}
          />
          <SectionMetric
            label={t("overview.water")}
            value={`${Math.round(water)} ml`}
            loading={isLoading}
          />
        </>
      }
    >
      {recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("common.no_data")}
        </p>
      ) : (
        recent.map((meal) => (
          <SectionRow
            key={meal.time}
            to={`/nutrition/meals/${meal.time}`}
            icon={<Utensils className="size-4" />}
            title={meal.entries?.[0]?.name ?? t("nutrition.manual_entry")}
            subtitle={format(new Date(meal.time), "dd.MM. HH:mm")}
            value={`${formatAmount(meal.carbs ?? 0)} g`}
          />
        ))
      )}
    </SectionCard>
  );
}
