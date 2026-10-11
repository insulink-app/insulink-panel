// Shared routine helpers + editor dialog; fast-refresh granularity doesn't
// apply to a helper module.
/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import sportService, {
  type Routine,
  type RoutineItem,
  type SportExercise,
} from "@/api/services/sport-service";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";

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
      {/* The name doubles as the page's headline — no boxed field around it. */}
      <Input
        value={draft.name}
        aria-label={t("routines.name")}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        placeholder={t("routines.name_placeholder")}
        className="h-auto rounded-xl border-0 bg-transparent px-0 py-1 text-[28px] font-extrabold tracking-tight focus-visible:bg-panel focus-visible:px-3"
      />

      <Card className="gap-2 p-6">
        <CardHeading
          title={t("routines.exercises")}
          action={
            <Button variant="secondary" size="sm" onClick={addItem} disabled={exercises.length === 0}>
              <Plus className="size-4" />
              {t("routines.add_exercise")}
            </Button>
          }
        />

        {exercises.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("routines.no_exercises")}</p>
        ) : (
          draft.items.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("routines.no_items")}</p>
          )
        )}

        <div className="divide-y divide-divider">
        {draft.items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            position={index + 1}
            exercises={exercises}
            onChange={(patch) => setItem(item.id, patch)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => onSave(draft)} disabled={saving || !draft.name.trim()}>
          {t("common.save")}
          {saving && <Spinner className="ml-2" />}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

// One exercise line of the card's divider list, its fields sunk into the page
// colour so only the values carry contrast.
function ItemRow({
  item,
  position,
  exercises,
  onChange,
  onRemove,
}: {
  item: RoutineItem;
  position: number;
  exercises: SportExercise[];
  onChange: (patch: Partial<RoutineItem>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label className="text-xs font-normal text-muted-foreground">
          {position}. {t("routines.exercise")}
        </Label>
        <Select value={item.ex} onValueChange={(value) => onChange({ ex: value })}>
          <SelectTrigger
            aria-label={t("routines.exercise")}
            className="w-full font-bold"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {exercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                {exercise.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[400px]">
        <NumberField
          label={t("routines.sets")}
          value={item.sets}
          onChange={(value) => onChange({ sets: value })}
        />
        <NumberField
          label={t("routines.target")}
          value={item.target}
          onChange={(value) => onChange({ target: value })}
        />
        <NumberField
          label={t("routines.weight")}
          value={item.weight}
          step={0.5}
          onChange={(value) => onChange({ weight: value })}
        />
        <NumberField
          label={t("routines.rest")}
          value={item.rest}
          step={5}
          onChange={(value) => onChange({ rest: value })}
        />
      </div>

      <Button
        variant="secondary"
        size="icon"
        aria-label={t("common.delete")}
        className="shrink-0 self-end lg:mb-1"
        onClick={onRemove}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
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
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="px-2 text-center font-bold"
      />
    </div>
  );
}
