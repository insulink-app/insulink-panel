import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ChevronRight, Dumbbell, ListChecks, Play, Plus } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="py-6 flex flex-col gap-4">
        {running && <RunningWorkoutCard routineId={running.routine} name={runningName} />}

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link to={`/health/routines/${FREE_ROUTINE_ID}/run`}>
              <Play className="size-4" />
              {t("routines.free")}
            </Link>
          </Button>
          <Button asChild variant="outline">
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
        </div>

        {routines.isLoading ? (
          <CardSkeleton />
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("routines.empty")}
          </p>
        ) : (
          list.map((routine) => (
            <Card key={routine.id} className="relative transition-colors hover:bg-secondary/50">
              <CardContent className="flex items-center gap-4 py-4">
                {/* Stretched link: the ::after covers the whole card, so clicking
                    anywhere on the box opens the routine. The Play button below
                    sits above it via z-10 to stay a separate target. */}
                <Link
                  to={`/health/routines/${routine.id}`}
                  className="flex flex-1 items-center gap-4 after:absolute after:inset-0"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                    <Dumbbell className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{routine.name || t("routines.untitled")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("routines.count", { n: routine.items.length })}
                    </div>
                  </div>
                </Link>
                {routine.items.length > 0 && (
                  <Button
                    asChild
                    size="icon"
                    className="relative z-10 size-11 shrink-0 rounded-full"
                    aria-label={t("routines.start")}
                  >
                    <Link to={`/health/routines/${routine.id}/run`}>
                      <Play className="size-5" />
                    </Link>
                  </Button>
                )}
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          ))
        )}
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
      <Card className="cursor-pointer border-primary/50 bg-primary/5 transition-colors hover:bg-primary/10">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15">
            <Activity className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t("routines.running")}</div>
            <div className="text-xs text-muted-foreground">{name || t("routines.untitled")}</div>
          </div>
          <Button size="sm">{t("routines.continue")}</Button>
        </CardContent>
      </Card>
    </Link>
  );
}
