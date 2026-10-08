import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil, Play, Trash2 } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { PageHeader } from "@/components/page-header";
import { formatAmount } from "@/lib/nutrition";
import sportService, { type RoutineItem } from "@/api/services/sport-service";
import { useRoutineWrites } from "../routines/shared";

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
    <PanelPage
      title={routine ? routine.name || t("routines.untitled") : t("routines.title")}
      parents={[
        { title: t("nav.health") },
        { title: t("routines.title"), href: "/health/routines" },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Button asChild variant="secondary" size="sm" className="self-start">
          <Link to="/health/routines">
            <ArrowLeft className="size-4" />
            {t("routines.back")}
          </Link>
        </Button>

        {routines.isLoading ? (
          <CardSkeleton />
        ) : !routine ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <>
            <PageHeader
              title={routine.name || t("routines.untitled")}
              subtitle={t("routines.count", { n: routine.items.length })}
              actions={
              <>
                <Button asChild variant="outline" className="bg-panel hover:bg-raised">
                  <Link to={`/health/routines/${routine.id}/edit`}>
                    <Pencil className="size-4" />
                    {t("routines.edit")}
                  </Link>
                </Button>
                <ConfirmDelete
                  onConfirm={() => remove(routine, () => navigate("/health/routines"))}
                  description={t("routines.delete_confirm", { name: routine.name || t("routines.untitled") })}
                >
                  <Button variant="outline" size="icon" className="bg-panel hover:bg-raised" aria-label={t("common.delete")} disabled={saving}>
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
              </>
              }
            />

            <Card className="gap-2 p-6">
              <CardHeading title={t("routines.exercises")} />
              {routine.items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("routines.no_items")}</p>
              ) : (
                <div className="divide-y divide-divider">
                {routine.items.map((item, index) => (
                  <ExerciseSection
                    key={item.id}
                    item={item}
                    position={index + 1}
                    name={exerciseName.get(item.ex) ?? t("routines.exercise")}
                  />
                ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </PanelPage>
  );
}

// One exercise as a divider row: its position and name, then the
// prescription in plain words. Sets × reps lead; weight and rest only when set.
function ExerciseSection({
  item,
  position,
  name,
}: {
  item: RoutineItem;
  position: number;
  name: string;
}) {
  const { t } = useTranslation();
  const parts = [
    <span key="sets" title={t("routines.sets")}>
      {t("routines.sets_by_target", { sets: item.sets, target: item.target })}
    </span>,
  ];
  if (item.weight > 0) {
    parts.push(
      <span key="weight" title={t("routines.weight")}>
        {`${formatAmount(item.weight)} ${t("body.kg")}`}
      </span>,
    );
  }
  if (item.rest > 0) {
    parts.push(
      <span key="rest" title={t("routines.rest")}>
        {t("routines.secs", { n: item.rest })}
      </span>,
    );
  }
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="w-6 shrink-0 text-[13px] font-bold text-label">{position}</span>
      <b className="min-w-0 flex-1 truncate text-sm">{name}</b>
      <span className="shrink-0 text-[13px] text-muted-foreground">
        {parts.flatMap((part, index) => (index === 0 ? [part] : [" · ", part]))}
      </span>
    </div>
  );
}
