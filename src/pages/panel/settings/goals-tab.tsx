import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { Stepper } from "@/components/stepper";
import nutritionService from "@/api/services/nutrition-service";
import sportService, { type MeasurementType } from "@/api/services/sport-service";
import { formatNumber } from "@/lib/format";
import { sumToday } from "../overview/today";
import { SettingRow } from "./setting-row";
import type { SettingsFormApi } from "./use-settings-form";

interface Goal {
  key: string;
  labelKey: string;
  fallback: number;
  step: number;
  unitKey?: string;
  /** Stored value per shown value: distance is stored in m and shown in km. */
  scale?: number;
  digits?: number;
}

const SPORT_GOALS: Goal[] = [
  { key: "sport.steps_goal", labelKey: "settings.steps_goal", fallback: 10000, step: 500 },
  { key: "sport.distance_goal_m", labelKey: "settings.distance_goal", fallback: 7000, step: 500, unitKey: "settings.units.km", scale: 1000, digits: 1 },
  { key: "sport.calories_goal", labelKey: "settings.calories_goal", fallback: 500, step: 50, unitKey: "settings.units.kcal" },
  { key: "sport.weight_goal_kg", labelKey: "settings.weight_goal", fallback: 70, step: 0.5, unitKey: "settings.units.kg", digits: 1 },
];

const NUTRITION_GOALS: Goal[] = [
  { key: "nutrition.water_goal_ml", labelKey: "settings.water_goal", fallback: 2000, step: 100, unitKey: "settings.units.ml" },
  { key: "nutrition.carbs_goal_g", labelKey: "settings.carbs_goal", fallback: 250, step: 10, unitKey: "settings.units.g" },
  { key: "nutrition.protein_goal_g", labelKey: "settings.protein_goal", fallback: 100, step: 5, unitKey: "settings.units.g" },
];

function GoalRows({ api, goals }: { api: SettingsFormApi; goals: Goal[] }) {
  const { t } = useTranslation();
  return goals.map((goal) => {
    const scale = goal.scale ?? 1;
    return (
      <SettingRow key={goal.key} label={t(goal.labelKey)}>
        <Stepper
          value={api.number(goal.key, goal.fallback) / scale}
          onChange={(next) => api.set(goal.key, Math.round(next * scale * 100) / 100)}
          step={goal.step / scale}
          digits={goal.digits}
          unit={goal.unitKey && t(goal.unitKey)}
          label={t(goal.labelKey)}
        />
      </SettingRow>
    );
  });
}

export function SportGoalsForm({ api }: { api: SettingsFormApi }) {
  return <GoalRows api={api} goals={SPORT_GOALS} />;
}

export function NutritionGoalsForm({ api }: { api: SettingsFormApi }) {
  return <GoalRows api={api} goals={NUTRITION_GOALS} />;
}

/** Today's steps, distance and calories against the goals, and the latest weight against its target. */
export function SportToday({ api }: { api: SettingsFormApi }) {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ["measurements"], queryFn: sportService.measurements });
  const entries = data?.entries ?? [];
  const today = (type: MeasurementType) =>
    sumToday(
      entries.filter((entry) => entry.type === type),
      (entry) => entry.time,
      (entry) => entry.value,
    );
  const weight = entries
    .filter((entry) => entry.type === "WEIGHT")
    .sort((left, right) => right.time - left.time)[0]?.value;
  const target = api.number("sport.weight_goal_kg", 70);
  const kilograms = t("settings.units.kg");
  return (
    <TodayCard>
      <Progress label={t("settings.steps_goal")} value={today("STEPS")} goal={api.number("sport.steps_goal", 10000)} color="var(--brand)" />
      <Progress
        label={t("settings.distance_goal")}
        value={today("DISTANCE")}
        goal={api.number("sport.distance_goal_m", 7000) / 1000}
        digits={1}
        unit={t("settings.units.km")}
        color="var(--brand)"
      />
      <Progress
        label={t("settings.calories_goal")}
        value={today("CALORIES")}
        goal={api.number("sport.calories_goal", 500)}
        unit={t("settings.units.kcal")}
        color="var(--brand)"
      />
      <div className="py-4">
        <div className="flex items-baseline justify-between gap-3">
          <b className="text-[15px]">{t("settings.weight")}</b>
          <span className="text-[13px] whitespace-nowrap text-muted-foreground">
            <b className="text-lg font-extrabold text-foreground">{weight ? formatNumber(weight, 1) : "–"}</b> {kilograms} ·{" "}
            {t("settings.weight_target", { value: formatNumber(target, 1) })}
          </span>
        </div>
        {weight && (
          <span className="text-[13px] text-muted-foreground">
            {Math.abs(weight - target) < 0.05
              ? t("settings.weight_reached")
              : t("settings.weight_left", { value: formatNumber(Math.abs(weight - target), 1) })}
          </span>
        )}
      </div>
    </TodayCard>
  );
}

/** Today's water, carbs and protein against the goals. */
export function NutritionToday({ api }: { api: SettingsFormApi }) {
  const { t } = useTranslation();
  const meals = useQuery({ queryKey: ["meals"], queryFn: nutritionService.meals }).data?.meals ?? [];
  const drinks = useQuery({ queryKey: ["drinks"], queryFn: nutritionService.drinks }).data?.drinks ?? [];
  const grams = t("settings.units.g");
  return (
    <TodayCard>
      <Progress
        label={t("settings.water_goal")}
        value={sumToday(drinks, (drink) => drink.at, (drink) => drink.ml)}
        goal={api.number("nutrition.water_goal_ml", 2000)}
        unit={t("settings.units.ml")}
        color="var(--water)"
      />
      <Progress
        label={t("settings.carbs_goal")}
        value={sumToday(meals, (meal) => meal.time, (meal) => meal.carbs ?? 0)}
        goal={api.number("nutrition.carbs_goal_g", 250)}
        unit={grams}
        color="var(--brand)"
      />
      <Progress
        label={t("settings.protein_goal")}
        value={sumToday(
          meals,
          (meal) => meal.time,
          (meal) => (meal.entries ?? []).reduce((sum, entry) => sum + (entry.protein ?? 0), 0),
        )}
        goal={api.number("nutrition.protein_goal_g", 100)}
        unit={grams}
        color="var(--teal)"
      />
    </TodayCard>
  );
}

function TodayCard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <Card className="gap-0 p-6">
      <CardHeading
        title={t("settings.today")}
        action={<span className="text-xs text-muted-foreground">{t("settings.as_of", { time: format(new Date(), "HH:mm") })}</span>}
      />
      <div className="mt-3 divide-y divide-divider border-t border-divider">{children}</div>
    </Card>
  );
}

function Progress({
  label,
  value,
  goal,
  unit,
  digits = 0,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  digits?: number;
  color: string;
}) {
  const percent = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="py-4">
      <div className="flex items-baseline justify-between gap-3">
        <b className="text-[15px]">{label}</b>
        <span className="text-[13px] whitespace-nowrap text-muted-foreground">
          <b className="text-lg font-extrabold text-foreground">{formatNumber(value, digits)}</b> / {formatNumber(goal, digits)}
          {unit && ` ${unit}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(goal)}
        className="mt-2.5 h-1.5 rounded-full bg-ground"
      >
        <div className="h-full min-w-1.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
