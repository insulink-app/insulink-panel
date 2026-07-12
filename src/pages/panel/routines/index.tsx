import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Dumbbell, ListChecks, Plus } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import sportService from "@/api/services/sport-service";

export default function RoutinesPage() {
  const { t } = useTranslation();
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const list = routines.data?.routines ?? [];

  return (
    <PanelPage title={t("routines.title")}>
      <div className="py-6 flex flex-col gap-4">
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
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("routines.empty")}
          </p>
        ) : (
          list.map((routine) => (
            <Link key={routine.id} to={`/health/routines/${routine.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                    <Dumbbell className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{routine.name || t("routines.untitled")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("routines.count", { n: routine.items.length })}
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </PanelPage>
  );
}
