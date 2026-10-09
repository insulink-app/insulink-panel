import { useTranslation } from "react-i18next";
import { Utensils } from "@/components/icons";
import { ListRow } from "@/components/list-row";
import type { Meal } from "@/api/services/nutrition-service";
import { formatAmount } from "@/lib/nutrition";
import { formatNumber } from "@/lib/format";
import { formatWhen } from "@/lib/when";
import { sumToday, todayRows } from "./today";
import { SectionCard } from "./section-card";

/** Today's carbs with bolus and meal count, plus the meals logged most recently. */
export function NutritionCard({
  meals,
  isLoading,
}: {
  meals: Meal[];
  isLoading?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const mealTime = (meal: Meal) => meal.time;

  const carbs = sumToday(meals, mealTime, (meal) => meal.carbs ?? 0);
  const bolus = sumToday(meals, mealTime, (meal) => meal.bolus ?? 0);

  const recent = meals
    .slice()
    .sort((left, right) => right.time - left.time)
    .slice(0, 3);

  return (
    <SectionCard
      title={t("overview.nutrition_today")}
      to="/nutrition/meals"
      loading={isLoading}
      empty={recent.length === 0}
      primary={{ label: t("overview.carbs"), value: formatNumber(carbs, 1), unit: "g" }}
      secondary={[
        { label: t("overview.bolus"), value: formatNumber(bolus, 1), unit: t("nutrition.unit_insulin") },
        { label: t("overview.meals"), value: String(todayRows(meals, mealTime).length) },
      ]}
    >
      {recent.map((meal) => (
        <ListRow
          key={meal.time}
          to={`/nutrition/meals/${meal.time}`}
          icon={<Utensils />}
          title={meal.entries?.[0]?.name ?? t("nutrition.manual_entry")}
          subtitle={formatWhen(meal.time, t, i18n.language)}
          value={`${formatAmount(meal.carbs ?? 0)} g`}
          detail={meal.bolus ? `${formatNumber(meal.bolus, 1)} ${t("nutrition.unit_insulin")}` : undefined}
        />
      ))}
    </SectionCard>
  );
}
