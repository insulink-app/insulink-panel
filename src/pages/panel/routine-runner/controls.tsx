// The controls both phase views share.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Routine, SportExercise } from "@/api/services/sport-service";

// Finishing saves the session and leaves the runner, so ask first.
export function FinishButton({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost">{t("routines.finish")}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("routines.finish_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("routines.finish_confirm")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onFinish}>{t("routines.finish")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function WeightRow({ weight, onDelta }: { weight: number; onDelta: (delta: number) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        className="size-12 rounded-full"
        aria-label={t("routines.weight_down")}
        onClick={() => onDelta(-2.5)}
      >
        <Minus className="size-5" />
      </Button>
      <span className="w-28 text-2xl font-bold tabular-nums">
        {weight.toFixed(1)} {t("body.kg")}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="size-12 rounded-full"
        aria-label={t("routines.weight_up")}
        onClick={() => onDelta(2.5)}
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}

// Tap the "exercise X/Y · set N/M" header to jump to any exercise, or to add one
// to the running workout.
export function JumpHeader({
  label,
  items,
  exercises,
  exerciseById,
  onJump,
  onAdd,
}: {
  label: string;
  items: Routine["items"];
  exercises: SportExercise[];
  exerciseById: (id: string) => SportExercise | undefined;
  onJump: (index: number) => void;
  onAdd: (exerciseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full text-lg text-muted-foreground hover:text-foreground"
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-1/2 z-10 mt-1 w-64 max-w-[85vw] -translate-x-1/2 rounded-lg border bg-popover p-1 shadow-md">
          {items.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                onJump(index);
                setOpen(false);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-base break-words hover:bg-secondary"
            >
              {index + 1}. {exerciseById(entry.ex)?.name ?? "—"}
            </button>
          ))}
          <div className="p-1">
            <AddExerciseDialog
              exercises={exercises}
              onAdd={(exerciseId) => {
                onAdd(exerciseId);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Pick an exercise for the running workout. It joins THIS session only — the
// stored routine keeps its own items, so a spontaneous extra exercise does not
// rewrite the plan for next time.
export function AddExerciseDialog({
  exercises,
  onAdd,
  className = "w-full",
  variant = "outline",
  labelKey = "routines.add_exercise",
}: {
  exercises: SportExercise[];
  onAdd: (exerciseId: string) => void;
  className?: string;
  variant?: "default" | "outline";
  labelKey?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Plus className="size-4" />
          {t(labelKey)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("routines.add_exercise")}</DialogTitle>
          <DialogDescription>{t("routines.add_exercise_hint")}</DialogDescription>
        </DialogHeader>
        {/* `shrink-0`: flex children shrink by default, so a list longer than
            the box squashed every row past its padding and the names ran into
            each other instead of the box scrolling. Names wrap rather than
            truncate — an exercise you cannot read is one you cannot pick. */}
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("routines.no_exercises")}</p>
          ) : (
            exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => {
                  onAdd(exercise.id);
                  setOpen(false);
                }}
                className="shrink-0 rounded-md px-3 py-2 text-left text-base break-words hover:bg-secondary"
              >
                {exercise.name}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
