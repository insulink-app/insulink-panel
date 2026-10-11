import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Footprints, Syringe, Utensils } from "@/components/icons";
import type { Meal } from "@/api/services/nutrition-service";
import type { Measurement, Routine, Training, Workout } from "@/api/services/sport-service";
import type { UserSettings } from "@/api/services/settings-service";
import { decodeProfiles } from "@/lib/basal";
import { formatNumber } from "@/lib/format";
import { activeInsulin, basalSteps, basalUnits, bolusDoses } from "@/lib/insulin";
import { formatAmount } from "@/lib/nutrition";
import { formatWeekday } from "@/lib/when";
import { workoutTitle } from "@/lib/workout";
import { RingCard } from "./ring-card";
import { sumToday, todayRows } from "./today";

const DEFAULT_CARBS_GOAL = 250;
const DEFAULT_STEPS_GOAL = 10000;
const DEFAULT_INSULIN_HOURS = 3;

const percent = (share: number) => `${Math.round(share * 100)} %`;

/** Today in three cards: carbs and steps against their goals, and the insulin given split into basal and bolus. */
export function DayCards({
  meals,
  workouts,
  trainings,
  routines,
  measurements,
  settings,
  podRunning,
}: {
  meals: Meal[];
  workouts: Workout[];
  trainings: Training[];
  routines: Routine[];
  measurements: Measurement[];
  settings?: UserSettings;
  /** Basal only counts while a pod is on. */
  podRunning: boolean;
}) {
  return (
    <div className="grid items-stretch gap-4 min-[1100px]:grid-cols-3">
      <CarbsCard meals={meals} goal={Number(settings?.["nutrition.carbs_goal_g"]) || DEFAULT_CARBS_GOAL} />
      <StepsCard
        workouts={workouts}
        trainings={trainings}
        routines={routines}
        measurements={measurements}
        goal={Number(settings?.["sport.steps_goal"]) || DEFAULT_STEPS_GOAL}
      />
      <InsulinCard meals={meals} settings={settings} podRunning={podRunning} />
    </div>
  );
}

function CarbsCard({ meals, goal }: { meals: Meal[]; goal: number }) {
  const { t } = useTranslation();
  const today = todayRows(meals, (meal) => meal.time).sort((left, right) => right.time - left.time);
  const carbs = today.reduce((sum, meal) => sum + (meal.carbs ?? 0), 0);
  const bolus = today.reduce((sum, meal) => sum + (meal.bolus ?? 0), 0);
  const share = carbs / goal;
  return (
    <RingCard
      icon={Utensils}
      label={t("overview.carbs")}
      value={formatAmount(Math.round(carbs * 10) / 10)}
      suffix={`/ ${formatNumber(goal)} g`}
      line={
        today.length
          ? [
              t("overview.meal_count", { count: today.length }),
              t("overview.bolus_amount", { value: formatNumber(bolus, 1) }),
              t("overview.last_at", { time: format(new Date(today[0].time), "HH:mm") }),
            ].join(" · ")
          : t("overview.no_meal")
      }
      parts={[{ share, color: "var(--brand)" }]}
      centre={<b className="text-base font-extrabold">{percent(share)}</b>}
    />
  );
}

function StepsCard({
  workouts,
  trainings,
  routines,
  measurements,
  goal,
}: {
  workouts: Workout[];
  trainings: Training[];
  routines: Routine[];
  measurements: Measurement[];
  goal: number;
}) {
  const { t, i18n } = useTranslation();
  const steps = sumToday(
    measurements.filter((entry) => entry.type === "STEPS"),
    (entry) => entry.time,
    (entry) => entry.value,
  );
  const routineName = new Map(routines.map((routine) => [routine.id, routine.name]));
  const latest = [
    ...workouts.map((workout) => ({ at: workout.started, name: workoutTitle(workout.routine, routineName, t) })),
    ...trainings.map((training) => ({ at: training.start, name: t("activity.type_" + training.type) })),
  ].sort((left, right) => right.at - left.at)[0];
  const share = steps / goal;
  return (
    <RingCard
      icon={Footprints}
      label={t("body.steps")}
      value={formatNumber(steps)}
      suffix={`/ ${formatNumber(goal)}`}
      line={
        latest
          ? t("overview.last_training", { name: latest.name, day: formatWeekday(latest.at, t, i18n.language) })
          : t("overview.no_training")
      }
      parts={[{ share, color: "var(--brand)" }]}
      centre={<b className="text-base font-extrabold">{percent(share)}</b>}
    />
  );
}

/**
 * Today's insulin: the scheduled basal since midnight (while a pod runs) and
 * the boluses logged with meals, the ring split between the two.
 */
function InsulinCard({ meals, settings, podRunning }: { meals: Meal[]; settings?: UserSettings; podRunning: boolean }) {
  const { t } = useTranslation();
  const now = Date.now();
  const midnight = new Date().setHours(0, 0, 0, 0);
  const profiles = decodeProfiles(settings?.basal_profiles);
  const basal = podRunning ? basalUnits(basalSteps(profiles.profiles[profiles.active].rates, midnight, now), now) : 0;
  const doses = bolusDoses(meals, midnight, now);
  const bolus = doses.reduce((sum, dose) => sum + dose.units, 0);
  const total = basal + bolus;
  const active = activeInsulin(bolusDoses(meals, 0, now), Number(settings?.bolus_insulin_duration_h) || DEFAULT_INSULIN_HOURS, now);
  const unit = t("nutrition.unit_insulin");
  return (
    <RingCard
      icon={Syringe}
      label={t("overview.insulin")}
      value={formatNumber(total, 1)}
      suffix={t("overview.insulin_today", { unit })}
      line={t("overview.insulin_line", {
        basal: formatNumber(basal, 1),
        bolus: formatNumber(bolus, 1),
        active: formatNumber(active, 1),
        unit,
      })}
      parts={
        total > 0
          ? [
              { share: bolus / total, color: "var(--teal)" },
              { share: basal / total, color: "var(--brand)" },
            ]
          : []
      }
      centre={
        <>
          <b className="block text-base font-extrabold">{total > 0 ? percent(bolus / total) : "–"}</b>
          <span className="text-[11px] font-bold text-teal">{t("overview.bolus")}</span>
        </>
      }
    />
  );
}
