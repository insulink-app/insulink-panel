import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Dumbbell, type LucideIcon, Pencil, Play, Timer, Trash2 } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="py-6 flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
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

            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {t("routines.exercises")}
              </h3>
              {routine.items.length === 0 ? (
                <p className="rounded-xl bg-secondary/40 py-10 text-center text-sm text-muted-foreground">
                  {t("routines.no_items")}
                </p>
              ) : (
                routine.items.map((item, index) => (
                  <ExerciseSection
                    key={item.id}
                    item={item}
                    position={index + 1}
                    name={exerciseName.get(item.ex) ?? t("routines.exercise")}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </PanelPage>
  );
}

// One exercise as its own block: name on the left, the prescription as chips on
// the right — the sets × reps lead, weight and rest only when they're set.
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
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex flex-col gap-4 px-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold tabular-nums">
            {position}
          </span>
          <span className="truncate text-lg font-semibold">{name}</span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            title={t("routines.sets")}
            className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold tabular-nums text-primary"
          >
            {t("routines.sets_by_target", { sets: item.sets, target: item.target })}
          </span>
          {item.weight > 0 && (
            <Chip
              icon={Dumbbell}
              label={t("routines.weight")}
              value={`${item.weight} ${t("body.kg")}`}
            />
          )}
          {item.rest > 0 && (
            <Chip
              icon={Timer}
              label={t("routines.rest")}
              value={t("routines.secs", { n: item.rest })}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Chip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium"
    >
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="tabular-nums">{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
