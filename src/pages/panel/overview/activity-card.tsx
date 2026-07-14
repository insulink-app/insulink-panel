import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Bike, Dumbbell, Footprints, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  CardioType,
  Measurement,
  Routine,
  Training,
  Workout,
} from "@/api/services/sport-service";
import { sumToday, todayRows } from "./today";
import { SectionCard, SectionMetric, SectionRow } from "./section-card";

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
  const minutes = (ms: number) =>
    t("overview.minutes", { n: Math.round(ms / 60000) });

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
      metrics={
        <>
          <SectionMetric
            label={t("overview.workouts")}
            value={String(todayRows(workouts, workoutStart).length)}
            loading={isLoading}
          />
          <SectionMetric
            label={t("overview.active_time")}
            value={minutes(activeToday)}
            loading={isLoading}
          />
          <SectionMetric
            label={t("body.distance")}
            value={`${(sumToday(trainings, trainingStart, (training) => training.dist) / 1000).toFixed(2)} ${t("body.km")}`}
            loading={isLoading}
          />
          <SectionMetric
            label={t("body.steps")}
            value={Math.round(
              sumToday(
                steps,
                (entry) => entry.time,
                (entry) => entry.value,
              ),
            ).toLocaleString()}
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
        recent.map((item) => (
          <RecentActivityRow
            key={`${item.kind}-${item.data.id}`}
            item={item}
            routineName={routineName}
          />
        ))
      )}
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
  const { t } = useTranslation();
  if (item.kind === "workout") {
    return (
      <SectionRow
        to={`/health/activity/workout/${item.data.id}`}
        icon={<Dumbbell className="size-4" />}
        title={routineName.get(item.data.routine) ?? t("activity.workout")}
        subtitle={format(new Date(item.at), "dd.MM. HH:mm")}
        value={t("activity.set_count", { n: item.data.sets.length })}
      />
    );
  }
  const Icon = CARDIO_ICON[item.data.type];
  return (
    <SectionRow
      to={`/health/activity/training/${item.data.id}`}
      icon={<Icon className="size-4" />}
      title={t("activity.type_" + item.data.type)}
      subtitle={format(new Date(item.at), "dd.MM. HH:mm")}
      value={`${(item.data.dist / 1000).toFixed(2)} ${t("body.km")}`}
    />
  );
}
