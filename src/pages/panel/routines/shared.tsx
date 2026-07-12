// Shared routine helpers + editor dialog; fast-refresh granularity doesn't
// apply to a helper module.
/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import sportService, {
  type Routine,
  type RoutineItem,
  type SportExercise,
} from "@/api/services/sport-service";

export const newId = () =>
  crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Shared full-replace writer for the routine collection. Reads the current list
// from the ["routines"] cache and re-syncs the whole thing on each mutation.
export function useRoutineWrites() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const list = data?.routines ?? [];

  const mutation = useMutation({
    mutationFn: (next: Routine[]) => sportService.syncRoutines(next),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("routines.saved"));
        queryClient.invalidateQueries({ queryKey: ["routines"] });
      } else {
        toast.error(t("routines.save_failed"));
      }
    },
    onError: () => toast.error(t("routines.save_failed")),
  });

  return {
    saving: mutation.isPending,
    save: (routine: Routine, onDone?: () => void) =>
      mutation.mutate([...list.filter((entry) => entry.id !== routine.id), routine], {
        onSuccess: (res) => res.success && onDone?.(),
      }),
    remove: (routine: Routine, onDone?: () => void) =>
      mutation.mutate(list.filter((entry) => entry.id !== routine.id), {
        onSuccess: (res) => res.success && onDone?.(),
      }),
  };
}

// Summary line for a routine item, e.g. "3 × 10 · 20 kg · 60s rest".
export function summarizeItem(
  item: RoutineItem,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const parts = [`${item.sets} × ${item.target}`];
  if (item.weight > 0) {
    parts.push(`${item.weight} ${t("body.kg")}`);
  }
  if (item.rest > 0) {
    parts.push(t("routines.rest_secs", { n: item.rest }));
  }
  return parts.join(" · ");
}

// Full-page routine editor form (create or edit). Uses the whole page rather
// than a cramped dialog.
export function RoutineForm({
  initial,
  exercises,
  saving,
  onCancel,
  onSave,
}: {
  initial: Routine;
  exercises: SportExercise[];
  saving: boolean;
  onCancel: () => void;
  onSave: (routine: Routine) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Routine>(initial);

  const setItem = (id: string, patch: Partial<RoutineItem>) =>
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));

  const addItem = () =>
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        { id: newId(), ex: exercises[0]?.id ?? "", sets: 3, target: 10, weight: 0, rest: 60 },
      ],
    }));

  const removeItem = (id: string) =>
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id),
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-md flex-col gap-2">
        <Label>{t("routines.name")}</Label>
        <Input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          placeholder={t("routines.name_placeholder")}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-base">{t("routines.exercises")}</Label>
        <Button variant="outline" onClick={addItem} disabled={exercises.length === 0}>
          <Plus className="size-4" />
          {t("routines.add_exercise")}
        </Button>
      </div>

      {exercises.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("routines.no_exercises")}</p>
      )}

      <div className="flex flex-col gap-3">
        {draft.items.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-end"
          >
            <div className="flex flex-1 flex-col gap-1">
              <Label className="text-xs">
                {index + 1}. {t("routines.exercise")}
              </Label>
              <select
                className="border rounded-md h-9 px-2 bg-transparent"
                value={item.ex}
                onChange={(event) => setItem(item.id, { ex: event.target.value })}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[420px]">
              <NumberField label={t("routines.sets")} value={item.sets} onChange={(value) => setItem(item.id, { sets: value })} />
              <NumberField label={t("routines.target")} value={item.target} onChange={(value) => setItem(item.id, { target: value })} />
              <NumberField label={t("routines.weight")} value={item.weight} step={0.5} onChange={(value) => setItem(item.id, { weight: value })} />
              <NumberField label={t("routines.rest")} value={item.rest} step={5} onChange={(value) => setItem(item.id, { rest: value })} />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="lg:mb-0.5">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => onSave(draft)} disabled={saving || !draft.name.trim()}>
          {t("common.save")}
          {saving && <Spinner className="ml-2" />}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </div>
  );
}
