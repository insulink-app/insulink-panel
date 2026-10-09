import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Dumbbell } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { ListRow } from "@/components/list-row";
import { WeeklyBars } from "@/components/weekly-bars";
import type { Routine, Workout } from "@/api/services/sport-service";
import { formatDay } from "@/lib/when";
import { formatNumber } from "@/lib/format";
import { workoutDurationMs, workoutTitle } from "@/lib/workout";
import { weeklyBuckets } from "../exercise-stats/stats";

/** The four newest workouts, each linking to its page. */
export function RecentWorkouts({ workouts, routines }: { workouts: Workout[]; routines: Routine[] }) {
  const { t, i18n } = useTranslation();
  const routineName = new Map(routines.map((routine) => [routine.id, routine.name]));
  const recent = workouts.slice().sort((left, right) => right.started - left.started).slice(0, 4);
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("routines.recent")} viewAll="/health/activity" />
      <div className="mt-2 divide-y divide-divider">
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          recent.map((workout) => (
            <ListRow
              key={workout.id}
              to={`/health/activity/workout/${workout.id}`}
              icon={<Dumbbell />}
              title={workoutTitle(workout.routine, routineName, t)}
              subtitle={`${formatDay(workout.started, t, i18n.language)} · ${format(new Date(workout.started), "HH:mm")}`}
              value={t("activity.set_count", { n: workout.sets.length })}
              detail={`${Math.round(workoutDurationMs(workout) / 60000)} ${t("overview.unit_min")}`}
            />
          ))
        )}
      </div>
    </Card>
  );
}

/** Workouts per week: this week's count large, the weeks as bars. */
export function WorkoutsPerWeek({ workouts }: { workouts: Workout[] }) {
  const { t } = useTranslation();
  const weeks = weeklyBuckets(workouts, () => 1).slice(-8);
  const average = weeks.reduce((sum, week) => sum + week.value, 0) / Math.max(1, weeks.length);
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("routines.per_week")} />
      <div className="mt-3 mb-4 flex items-baseline gap-2.5">
        <b className="text-[32px] leading-none font-extrabold">{weeks[weeks.length - 1]?.value ?? 0}</b>
        <span className="text-[13px] text-muted-foreground">{t("routines.this_week", { avg: formatNumber(average, 1) })}</span>
      </div>
      <WeeklyBars
        data={weeks}
        averageLabel={(avg) => t("routines.average_short", { avg })}
        formatValue={(value) => `${value} ${t("exercise_stats.workouts")}`}
      />
    </Card>
  );
}
