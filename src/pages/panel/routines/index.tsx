import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ChevronRight, Dumbbell, ListChecks, Play, Plus } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import sportService, { type Routine } from "@/api/services/sport-service";

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

  return (
    <PanelPage title={t("routines.title")} parents={[{ title: t("nav.health") }]}>
      <div className="py-6 flex flex-col gap-4">
        {runningRoutine && <RunningWorkoutCard routine={runningRoutine} />}

        <div className="flex justify-end gap-2">
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
            <Card key={routine.id} className="transition-colors hover:bg-secondary/50">
              <CardContent className="flex items-center gap-4 py-4">
                <Link
                  to={`/health/routines/${routine.id}`}
                  className="flex flex-1 items-center gap-4"
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
                    className="size-11 shrink-0 rounded-full"
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
function RunningWorkoutCard({ routine }: { routine: Routine }) {
  const { t } = useTranslation();
  return (
    <Link to={`/health/routines/${routine.id}/run`}>
      <Card className="cursor-pointer border-primary/50 bg-primary/5 transition-colors hover:bg-primary/10">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15">
            <Activity className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t("routines.running")}</div>
            <div className="text-xs text-muted-foreground">
              {routine.name || t("routines.untitled")}
            </div>
          </div>
          <Button size="sm">{t("routines.continue")}</Button>
        </CardContent>
      </Card>
    </Link>
  );
}
