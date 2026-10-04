import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import sportService, {
  type ExerciseKind,
  type SportExercise,
} from "@/api/services/sport-service";
import { newId } from "../routines/shared";

const KINDS: ExerciseKind[] = ["reps", "weighted", "timed"];

export default function ExercisesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const list = data?.exercises ?? [];

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

  return (
    <PanelPage title={t("exercises.title")} parents={[{ title: t("nav.health") }]}>
      <div className="py-6 flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <Button onClick={() => setEditing({ id: newId(), name: "", kind: "reps" })}>
            <Plus className="size-4" />
            {t("exercises.add")}
          </Button>
        </div>

        {isLoading ? (
          <CardSkeleton />
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("exercises.empty")}
          </p>
        ) : (
          list.map((exercise) => (
            <Card key={exercise.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex-1">
                  <div className="font-medium">{exercise.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("exercises.kind_" + exercise.kind)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t("common.edit")}
                  onClick={() => setEditing(exercise)}
                >
                  <Pencil className="size-4" />
                </Button>
                <ConfirmDelete
                  onConfirm={() => remove(exercise)}
                  description={t("exercises.delete_confirm", { name: exercise.name })}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t("common.delete")}
                    disabled={mutation.isPending}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </ConfirmDelete>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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

function ExerciseEditor({
  exercise,
  saving,
  onCancel,
  onSave,
}: {
  exercise: SportExercise;
  saving: boolean;
  onCancel: () => void;
  onSave: (exercise: SportExercise) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SportExercise>(exercise);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{exercise.name ? t("exercises.edit") : t("exercises.add")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("exercises.name")}</Label>
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("exercises.kind")}</Label>
            <Select
              value={draft.kind}
              onValueChange={(kind) =>
                setDraft((current) => ({ ...current, kind: kind as ExerciseKind }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t("exercises.kind_" + kind)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onSave(draft)} disabled={saving || !draft.name.trim()}>
            {t("common.save")}
            {saving && <Spinner className="ml-2" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
