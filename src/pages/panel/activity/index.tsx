import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { differenceInCalendarDays, format } from "date-fns";
import { Bike, Dumbbell, Footprints, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import sportService, {
  type CardioType,
  type Training,
  type Workout,
} from "@/api/services/sport-service";

const CARDIO_ICON: Record<CardioType, LucideIcon> = {
  walk: Footprints,
  jog: Zap,
  bike: Bike,
};

// A unified row over the two collections, so one time-sorted list renders both.
type ActivityItem =
  | { kind: "workout"; at: number; data: Workout }
  | { kind: "training"; at: number; data: Training };

export default function ActivityPage() {
  const { t } = useTranslation();
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const trainings = useQuery({ queryKey: ["trainings"], queryFn: sportService.trainings });
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });

  const routineName = useMemo(
    () => new Map((routines.data?.routines ?? []).map((routine) => [routine.id, routine.name])),
    [routines.data],
  );

  const items = useMemo<ActivityItem[]>(() => {
    const merged: ActivityItem[] = [
      ...(workouts.data?.workouts ?? []).map(
        (workout): ActivityItem => ({ kind: "workout", at: workout.started, data: workout }),
      ),
      ...(trainings.data?.trainings ?? []).map(
        (training): ActivityItem => ({ kind: "training", at: training.start, data: training }),
      ),
    ];
    return merged.sort((left, right) => right.at - left.at);
  }, [workouts.data, trainings.data]);

  // Same-day items share a heading; `items` is already newest-first, so grouping
  // keeps that order. The key is the plain date — never the translated label.
  const days = useMemo(() => {
    const byDay = new Map<string, ActivityItem[]>();
    for (const item of items) {
      const day = format(new Date(item.at), "dd.MM.yyyy");
      const existing = byDay.get(day);
      if (existing) {
        existing.push(item);
      } else {
        byDay.set(day, [item]);
      }
    }
    return [...byDay];
  }, [items]);

  const isLoading = workouts.isLoading || trainings.isLoading;

  return (
    <PanelPage title={t("activity.title")} parents={[{ title: t("nav.health") }]}>
      <div className="py-6">
        {isLoading ? (
          <CardSkeleton />
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {days.map(([day, dayItems]) => (
              <div key={day} className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  <DayHeading at={dayItems[0].at} date={day} />
                </h2>
                {dayItems.map((item) => (
                  <ActivityRow
                    key={`${item.kind}-${item.data.id}`}
                    item={item}
                    routineName={routineName}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelPage>
  );
}

// "Today"/"Yesterday" for the two most recent days, the weekday name within the
// past week, the plain date before that.
function DayHeading({ at, date }: { at: number; date: string }) {
  const { t, i18n } = useTranslation();
  const daysAgo = differenceInCalendarDays(new Date(), new Date(at));
  if (daysAgo === 0) {
    return t("activity.today");
  }
  if (daysAgo === 1) {
    return t("activity.yesterday");
  }
  if (daysAgo < 7) {
    // Intl carries the weekday names, so neither locale JSON has to list them.
    return new Intl.DateTimeFormat(i18n.language.replace("_", "-"), { weekday: "long" }).format(
      new Date(at),
    );
  }
  return date;
}

function ActivityRow({
  item,
  routineName,
}: {
  item: ActivityItem;
  routineName: Map<string, string>;
}) {
  const { t } = useTranslation();
  const isWorkout = item.kind === "workout";
  const Icon = isWorkout ? Dumbbell : CARDIO_ICON[(item.data as Training).type];
  const title = isWorkout
    ? routineName.get((item.data as Workout).routine) ?? t("activity.workout")
    : t("activity.type_" + (item.data as Training).type);
  const summary = isWorkout
    ? t("activity.set_count", { n: (item.data as Workout).sets.length })
    : `${((item.data as Training).dist / 1000).toFixed(2)} ${t("body.km")}`;

  return (
    <Link to={`/health/activity/${item.kind}/${item.data.id}`}>
      <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
        <CardContent className="flex items-center gap-4 py-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
            <Icon className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(item.at), "HH:mm")}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">{summary}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
