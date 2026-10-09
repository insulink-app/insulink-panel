import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dumbbell } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { TimelineList } from "@/components/timeline-list";
import { formatNumber } from "@/lib/format";
import { workoutTitle } from "@/lib/workout";
import sportService from "@/api/services/sport-service";
import { itemDurationMs, matchesFilter, mergeActivities, type ActivityFilter, type ActivityItem } from "./items";
import { CARDIO_ICON, HeatmapCard, KindsCard, WeekCard } from "./side-cards";

export default function ActivityPage() {
  const { t } = useTranslation();
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const trainings = useQuery({ queryKey: ["trainings"], queryFn: sportService.trainings });
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const routineName = useMemo(
    () => new Map((routines.data?.routines ?? []).map((routine) => [routine.id, routine.name])),
    [routines.data],
  );
  const items = useMemo(
    () => mergeActivities(workouts.data?.workouts ?? [], trainings.data?.trainings ?? []),
    [workouts.data, trainings.data],
  );
  const shown = items.filter((item) => matchesFilter(item, filter));
  const isLoading = workouts.isLoading || trainings.isLoading;
  const filterOptions: { value: ActivityFilter; label: string }[] = [
    { value: "all", label: t("activity.filter_all") },
    { value: "workout", label: t("activity.filter_workout") },
    { value: "walk", label: t("activity.type_walk") },
    { value: "jog", label: t("activity.type_jog") },
    { value: "bike", label: t("activity.type_bike") },
  ];

  /** One activity as a timeline row: type icon, title with duration, result. */
  const toRow = (item: ActivityItem) => {
    const Icon = item.kind === "workout" ? Dumbbell : CARDIO_ICON[item.data.type];
    return {
      key: `${item.kind}-${item.data.id}`,
      time: item.at,
      color: "var(--brand)",
      icon: <Icon />,
      title:
        item.kind === "workout"
          ? workoutTitle(item.data.routine, routineName, t)
          : t("activity.type_" + item.data.type),
      detail: `${Math.round(itemDurationMs(item) / 60000)} ${t("overview.unit_min")}`,
      aside: (
        <b className="text-sm whitespace-nowrap">
          {item.kind === "workout"
            ? t("activity.set_count", { n: item.data.sets.length })
            : `${formatNumber(item.data.dist / 1000, 2)} ${t("body.km")}`}
        </b>
      ),
      to: `/health/activity/${item.kind}/${item.data.id}`,
    };
  };

  return (
    <PanelPage title={t("activity.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader title={t("activity.title")} />
      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="gap-0 p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="flex-1 text-lg font-extrabold">{t("activity.history")}</h2>
              <Segmented label={t("activity.history")} value={filter} onChange={setFilter} options={filterOptions} />
            </div>
            {shown.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
            ) : (
              <TimelineList
                items={shown.map(toRow)}
                countLabel={(count) => t("activity.count", { count })}
                olderLabel={t("activity.older")}
              />
            )}
          </Card>
          <div className="flex min-w-0 flex-col gap-4">
            <WeekCard items={items} />
            <HeatmapCard items={items} />
            <KindsCard items={items} className="flex-1" />
          </div>
        </div>
      )}
    </PanelPage>
  );
}
