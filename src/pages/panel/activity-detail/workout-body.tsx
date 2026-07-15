import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>{t("routines.exercises")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.exerciseId}>
            <div className="mb-1 font-medium">
              {exerciseName.get(group.exerciseId) ?? t("activity.exercise")}
            </div>
            <div className="flex flex-col gap-1">
              {group.sets.map((set, index) => (
                <div
                  key={set.ts + "-" + index}
                  className="flex justify-between rounded-md bg-secondary/40 px-3 py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">
                    {t("activity.set")} {index + 1}
                  </span>
                  <span className="font-medium">{formatSet(set, t)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function formatSet(set: SetLog, t: (key: string, options?: Record<string, unknown>) => string) {
  if (set.dur != null) {
    return formatDuration(set.dur);
  }
  const reps = set.reps ?? set.secs ?? 0;
  if (set.kg != null && set.kg > 0) {
    return `${reps} × ${set.kg} ${t("body.kg")}`;
  }
  return t("activity.reps", { n: reps });
}
