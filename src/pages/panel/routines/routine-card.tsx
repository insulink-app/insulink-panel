import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dumbbell, Play } from "@/components/icons";
import { Card } from "@/components/ui/card";
import type { Routine } from "@/api/services/sport-service";

/**
 * One routine as a compact card: icon, name and exercise count, and a round
 * Play button. The rest of the card opens the routine.
 */
export function RoutineCard({ routine }: { routine: Routine }) {
  const { t } = useTranslation();
  const name = routine.name || t("routines.untitled");
  return (
    <Card className="relative flex-row items-center gap-4 p-6 transition-colors hover:bg-raised">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
        <Dumbbell size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <Link
          to={`/health/routines/${routine.id}`}
          className="block truncate rounded-md text-lg font-bold after:absolute after:inset-0 after:rounded-3xl"
        >
          {name}
        </Link>
        <span className="text-[13px] text-muted-foreground">{t("routines.count", { n: routine.items.length })}</span>
      </span>
      {routine.items.length > 0 && (
        <Link
          to={`/health/routines/${routine.id}/run`}
          aria-label={t("routines.start_named", { name })}
          className="relative z-10 grid size-[52px] shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Play className="size-[18px]" weight="fill" aria-hidden />
        </Link>
      )}
    </Card>
  );
}
