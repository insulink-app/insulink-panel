import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { PageHeader } from "@/components/page-header";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import sportService, { type SportExercise } from "@/api/services/sport-service";
import { newId } from "../routines/shared";
import { buildStats } from "../exercise-stats/stats";
import { ExerciseEditor } from "./exercise-editor";
import { ExerciseList } from "./exercise-list";
import { ExerciseDetail } from "./exercise-detail";

export default function ExercisesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const list = useMemo(() => data?.exercises ?? [], [data]);
  const stats = useMemo(() => buildStats(workouts.data?.workouts ?? [], list), [workouts.data, list]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();

  const mutation = useMutation({
    mutationFn: (next: SportExercise[]) => sportService.syncExercises(next),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("exercises.saved"));
        queryClient.invalidateQueries({ queryKey: ["exercises"] });
      } else {
        toast.error(t("exercises.save_failed"));
      }
    },
    onError: () => toast.error(t("exercises.save_failed")),
  });
  const [editing, setEditing] = useState<SportExercise | null>(null);

  const save = (exercise: SportExercise) =>
    mutation.mutate(
      [...list.filter((entry) => entry.id !== exercise.id), exercise],
      { onSuccess: (res) => res.success && setEditing(null) },
    );
  const remove = (exercise: SportExercise) =>
    mutation.mutate(list.filter((entry) => entry.id !== exercise.id));

  const shown = list.filter((exercise) => exercise.name.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = list.find((exercise) => exercise.id === selectedId) ?? list[0];
  const setsById = new Map(stats.map((stat) => [stat.exercise.id, stat.totalSets]));

  return (
    <PanelPage title={t("exercises.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader
        title={t("exercises.title")}
        actions={
          <Button className="h-10 px-4" onClick={() => setEditing({ id: newId(), name: "", kind: "reps" })}>
            <Plus className="size-4" />
            {t("exercises.add")}
          </Button>
        }
      />
      {isLoading ? (
        <CardSkeleton />
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("exercises.empty")}</p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <ExerciseList
            exercises={shown}
            setsById={setsById}
            selectedId={selected?.id}
            query={query}
            onQuery={setQuery}
            onSelect={setSelectedId}
          />
          {selected && (
            <ExerciseDetail
              exercise={selected}
              stat={stats.find((stat) => stat.exercise.id === selected.id)}
              routines={routines.data?.routines ?? []}
              deleting={mutation.isPending}
              onEdit={() => setEditing(selected)}
              onDelete={() => remove(selected)}
            />
          )}
        </div>
      )}

      {editing && (
        <ExerciseEditor
          exercise={editing}
          saving={mutation.isPending}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </PanelPage>
  );
}
