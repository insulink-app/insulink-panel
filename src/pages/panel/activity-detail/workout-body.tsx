import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { formatAmount } from "@/lib/nutrition";
import type { SetLog, Workout } from "@/api/services/sport-service";
import { formatDuration } from "./format";

export function WorkoutBody({
  workout,
  exerciseName,
}: {
  workout: Workout;
  exerciseName: Map<string, string>;
}) {
  const { t } = useTranslation();
  const groups: { exerciseId: string; sets: SetLog[] }[] = [];
  for (const set of workout.sets) {
    let group = groups.find((entry) => entry.exerciseId === set.ex);
    if (!group) {
      group = { exerciseId: set.ex, sets: [] };
      groups.push(group);
    }
    group.sets.push(set);
  }

  return (
    <Card className="gap-4 p-6">
      <CardHeading title={t("routines.exercises")} />
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.exerciseId}>
            <b className="block text-[15px]">
              {exerciseName.get(group.exerciseId) ?? t("activity.exercise")}
            </b>
            <div className="divide-y divide-divider">
              {group.sets.map((set, index) => (
                <div key={set.ts + "-" + index} className="flex justify-between py-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {t("activity.set")} {index + 1}
                  </span>
                  <b>{formatSet(set, t)}</b>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatSet(set: SetLog, t: (key: string, options?: Record<string, unknown>) => string) {
  if (set.dur != null) {
    return formatDuration(set.dur);
  }
  const reps = set.reps ?? set.secs ?? 0;
  if (set.kg != null && set.kg > 0) {
    return `${reps} × ${formatAmount(set.kg)} ${t("body.kg")}`;
  }
  return t("activity.reps", { n: reps });
}
