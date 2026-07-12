import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil, Play, Trash2 } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import sportService from "@/api/services/sport-service";
import { summarizeItem, useRoutineWrites } from "../routines/shared";

export default function RoutineDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const { remove, saving } = useRoutineWrites();

  const routine = routines.data?.routines?.find((entry) => entry.id === id);
  const exerciseName = new Map(
    (exercises.data?.exercises ?? []).map((exercise) => [exercise.id, exercise.name]),
  );

  return (
    <PanelPage title={t("routines.title")}>
      <div className="py-6 flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/health/routines">
            <ArrowLeft className="size-4" />
            {t("routines.back")}
          </Link>
        </Button>

        {routines.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : !routine ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{routine.name || t("routines.untitled")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("routines.count", { n: routine.items.length })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to={`/health/routines/${routine.id}/edit`}>
                    <Pencil className="size-4" />
                    {t("routines.edit")}
                  </Link>
                </Button>
                <ConfirmDelete
                  onConfirm={() => remove(routine, () => navigate("/health/routines"))}
                  description={t("routines.delete_confirm", { name: routine.name || t("routines.untitled") })}
                >
                  <Button variant="outline" disabled={saving}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </ConfirmDelete>
                <Button
                  disabled={routine.items.length === 0}
                  onClick={() => navigate(`/health/routines/${routine.id}/run`)}
                >
                  <Play className="size-4" />
                  {t("routines.start")}
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("routines.exercises")}</CardTitle>
              </CardHeader>
              <CardContent>
                {routine.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("routines.no_items")}</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {routine.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-md bg-secondary/40 px-3 py-2 text-sm"
                      >
                        <span className="w-6 text-center text-muted-foreground">{index + 1}</span>
                        <span className="flex-1 font-medium">
                          {exerciseName.get(item.ex) ?? t("routines.exercise")}
                        </span>
                        <span className="text-muted-foreground">{summarizeItem(item, t)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PanelPage>
  );
}
