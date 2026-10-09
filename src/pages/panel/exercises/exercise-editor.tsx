import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ExerciseKind, SportExercise } from "@/api/services/sport-service";

const KINDS: ExerciseKind[] = ["reps", "weighted", "timed"];

export function ExerciseEditor({
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
              <SelectTrigger className="w-full">
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
          <Button variant="secondary" onClick={onCancel}>
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
