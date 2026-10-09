import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dumbbell, MoreHorizontal, Pencil, Play } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Routine, SportExercise } from "@/api/services/sport-service";
import { plannedRoutineSeconds } from "../routine-runner/core";
import { formatWhen } from "@/lib/when";

const PREVIEW = 3;

/**
 * One routine as a card: its size and planned time, the first exercises, when
 * it was last done, and the ways to edit and start it.
 */
export function RoutineCard({
  routine,
  exerciseById,
  lastDone,
}: {
  routine: Routine;
  exerciseById: (id: string) => SportExercise | undefined;
  lastDone?: number;
}) {
  const { t, i18n } = useTranslation();
  const name = routine.name || t("routines.untitled");
  const sets = routine.items.reduce((sum, item) => sum + item.sets, 0);
  const minutes = Math.round(plannedRoutineSeconds(routine, exerciseById) / 60);
  const names = routine.items.map((item) => exerciseById(item.ex)?.name ?? t("routines.exercise"));
  const preview = [...names.slice(0, PREVIEW), ...(names.length > PREVIEW ? [`+${names.length - PREVIEW}`] : [])];

  return (
    <Card className="h-full gap-0 p-6">
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
          <Dumbbell size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <Link to={`/health/routines/${routine.id}`} className="block truncate rounded-md text-lg font-bold hover:opacity-80">
            {name}
          </Link>
          <span className="text-[13px] text-muted-foreground">
            {t("routines.meta", { exercises: routine.items.length, sets, minutes })}
          </span>
        </span>
        <Button asChild size="icon" variant="ghost" className="size-9 text-muted-foreground" aria-label={t("routines.more")}>
          <Link to={`/health/routines/${routine.id}`}>
            <MoreHorizontal className="size-4" />
          </Link>
        </Button>
      </div>
      <p className="mt-[18px] mb-5 text-[13px] leading-relaxed text-muted-foreground">
        {preview.length > 0 ? preview.join(" · ") : t("routines.no_items")}
      </p>
      <div className="mt-auto flex items-center gap-2.5 border-t border-divider pt-4">
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
          {lastDone != null && (
            <>
              {t("routines.last_done")} <b className="text-foreground">{formatWhen(lastDone, t, i18n.language)}</b>
            </>
          )}
        </span>
        <Button asChild variant="outline" className="h-10 border border-line bg-panel px-4 hover:bg-raised">
          <Link to={`/health/routines/${routine.id}/edit`}>
            <Pencil className="size-4" />
            {t("common.edit")}
          </Link>
        </Button>
        {routine.items.length > 0 && (
          <Button asChild size="icon-lg" aria-label={t("routines.start_named", { name })}>
            <Link to={`/health/routines/${routine.id}/run`}>
              <Play className="size-[18px]" weight="fill" />
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
