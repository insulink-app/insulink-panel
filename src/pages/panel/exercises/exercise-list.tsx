import { useTranslation } from "react-i18next";
import { ChevronRight, Search } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SportExercise } from "@/api/services/sport-service";

/**
 * The library on the left of the page: a search over the names and the list,
 * the selected exercise on a raised surface with the brand bar.
 */
export function ExerciseList({
  exercises,
  setsById,
  selectedId,
  query,
  onQuery,
  onSelect,
}: {
  exercises: SportExercise[];
  setsById: Map<string, number>;
  selectedId?: string;
  query: string;
  onQuery: (query: string) => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="gap-2 p-4">
      <div className="relative mb-1">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t("exercises.search")}
          aria-label={t("exercises.search")}
          className="pl-10"
        />
      </div>
      <ul className="flex flex-col gap-0.5">
        {exercises.map((exercise) => {
          const selected = exercise.id === selectedId;
          return (
            <li key={exercise.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(exercise.id)}
                className={`relative flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors ${selected ? "bg-raised-strong" : "hover:bg-raised"}`}
              >
                {selected && <i className="absolute top-3 bottom-3 left-0 block w-[3px] rounded-sm bg-primary" aria-hidden />}
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{exercise.name}</b>
                  <span className="text-xs text-muted-foreground">
                    {t("exercises.kind_" + exercise.kind)} · {t("activity.set_count", { n: setsById.get(exercise.id) ?? 0 })}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
