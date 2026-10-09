import { useTranslation } from "react-i18next";
import { Bike, Dumbbell, Footprints, Zap } from "@/components/icons";
import type { LucideIcon } from "@/components/icons";
import type {
  CardioType,
  Measurement,
  Routine,
  Training,
  Workout,
} from "@/api/services/sport-service";
import { workoutTitle } from "@/lib/workout";
import { sumToday, todayRows } from "./today";
import { SectionCard } from "./section-card";
import { ListRow } from "@/components/list-row";
import { formatNumber } from "@/lib/format";
import { formatWhen } from "@/lib/when";

const CARDIO_ICON: Record<CardioType, LucideIcon> = {
  walk: Footprints,
  jog: Zap,
  bike: Bike,
};

// A workout carries no end time; its last logged set is when it stopped.
function workoutDuration(workout: Workout) {
  const last = workout.sets[workout.sets.length - 1];
  return last ? Math.max(0, last.ts - workout.started) : 0;
}

const trainingDuration = (training: Training) =>
  Math.max(0, training.end - training.start);

type ActivityItem =
  | { kind: "workout"; at: number; data: Workout }
  | { kind: "training"; at: number; data: Training };

/** Today's training load, plus the workouts and trainings logged most recently. */
export function ActivityCard({
  workouts,
  trainings,
  routines,
  measurements,
  isLoading,
}: {
  workouts: Workout[];
  trainings: Training[];
  routines: Routine[];
  measurements: Measurement[];
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const workoutStart = (workout: Workout) => workout.started;
  const trainingStart = (training: Training) => training.start;

  const steps = measurements.filter((entry) => entry.type === "STEPS");
  const activeToday =
    sumToday(trainings, trainingStart, trainingDuration) +
    sumToday(workouts, workoutStart, workoutDuration);

  const routineName = new Map(
    routines.map((routine) => [routine.id, routine.name]),
  );

  const recent: ActivityItem[] = [
    ...workouts.map(
      (workout): ActivityItem => ({
        kind: "workout",
        at: workout.started,
        data: workout,
      }),
    ),
    ...trainings.map(
      (training): ActivityItem => ({
        kind: "training",
        at: training.start,
        data: training,
      }),
    ),
  ]
    .sort((left, right) => right.at - left.at)
    .slice(0, 3);

  return (
    <SectionCard
      title={t("overview.activity_today")}
      to="/health/activity"
      loading={isLoading}
      empty={recent.length === 0}
      primary={{
        label: t("body.steps"),
        value: formatNumber(sumToday(steps, (entry) => entry.time, (entry) => entry.value)),
      }}
      secondary={[
        { label: t("overview.workouts"), value: String(todayRows(workouts, workoutStart).length) },
        { label: t("overview.active_time"), value: formatNumber(activeToday / 60000), unit: t("overview.unit_min") },
      ]}
    >
      {recent.map((item) => (
        <RecentActivityRow key={`${item.kind}-${item.data.id}`} item={item} routineName={routineName} />
      ))}
    </SectionCard>
  );
}

function RecentActivityRow({
  item,
  routineName,
}: {
  item: ActivityItem;
  routineName: Map<string, string>;
}) {
  const { t, i18n } = useTranslation();
  const when = formatWhen(item.at, t, i18n.language);
  if (item.kind === "workout") {
    return (
      <ListRow
        to={`/health/activity/workout/${item.data.id}`}
        icon={<Dumbbell />}
        title={workoutTitle(item.data.routine, routineName, t)}
        subtitle={when}
        value={t("activity.set_count", { n: item.data.sets.length })}
      />
    );
  }
  const Icon = CARDIO_ICON[item.data.type];
  return (
    <ListRow
      to={`/health/activity/training/${item.data.id}`}
      icon={<Icon />}
      title={t("activity.type_" + item.data.type)}
      subtitle={when}
      value={`${formatNumber(item.data.dist / 1000, 2)} ${t("body.km")}`}
    />
  );
}
