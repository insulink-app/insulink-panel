import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ChevronRight, Dumbbell, ListChecks, Play, Plus } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import sportService from "@/api/services/sport-service";
import { FREE_ROUTINE_ID } from "@/lib/workout";

export default function RoutinesPage() {
  const { t } = useTranslation();
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  // Polled so a workout started on the phone surfaces here without a reload.
  const active = useQuery({
    queryKey: ["active-workout"],
    queryFn: sportService.activeWorkout,
    refetchInterval: 15000,
  });
  const list = routines.data?.routines ?? [];
  const running = active.data?.workout;
  const runningRoutine = list.find((entry) => entry.id === running?.routine);
  // A free workout is in no list, so its name comes from the snapshot itself.
  const runningName =
    running?.routine === FREE_ROUTINE_ID
      ? t("routines.free")
      : (runningRoutine?.name ?? running?.name ?? "");

  return (
    <PanelPage title={t("routines.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader
        title={t("routines.title")}
        actions={
          <>
            <Button asChild variant="outline" className="bg-panel hover:bg-raised">
              <Link to={`/health/routines/${FREE_ROUTINE_ID}/run`}>
                <Play className="size-4" />
                {t("routines.free")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-panel hover:bg-raised">
              <Link to="/health/routines/exercises">
                <ListChecks className="size-4" />
                {t("exercises.title")}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/health/routines/new">
                <Plus className="size-4" />
                {t("routines.add")}
              </Link>
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-4">
        {running && <RunningWorkoutCard routineId={running.routine} name={runningName} />}

        <Card className="gap-0 px-6 py-3">
          {routines.isLoading ? (
            <div className="py-3">
              <CardSkeleton />
            </div>
          ) : list.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("routines.empty")}</p>
          ) : (
            <div className="divide-y divide-divider">
              {list.map((routine) => (
                <div key={routine.id} className="flex items-center gap-3">
                  <Link
                    to={`/health/routines/${routine.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-3 transition-opacity hover:opacity-80"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
                      <Dumbbell size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{routine.name || t("routines.untitled")}</b>
                      <span className="block text-xs text-muted-foreground">
                        {t("routines.count", { n: routine.items.length })}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                  {routine.items.length > 0 && (
                    <Button asChild size="icon" className="shrink-0" aria-label={t("routines.start")}>
                      <Link to={`/health/routines/${routine.id}/run`}>
                        <Play className="size-[18px]" weight="fill" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PanelPage>
  );
}

// A workout is running on this account — most likely started in the app. Opening
// the runner picks it up at the set it is on, rather than starting a new one.
// Named by id, not by a routine from the list: a free workout has none.
function RunningWorkoutCard({ routineId, name }: { routineId: string; name: string }) {
  const { t } = useTranslation();
  return (
    <Link to={`/health/routines/${routineId}/run`}>
      <Card className="flex-row items-center gap-3 px-6 py-4 transition-colors hover:bg-raised">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
          <Activity size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-sm">{t("routines.running")}</b>
          <span className="block truncate text-xs text-muted-foreground">{name || t("routines.untitled")}</span>
        </span>
        <span className={buttonVariants({ size: "sm" })}>{t("routines.continue")}</span>
      </Card>
    </Link>
  );
}
