// The controls both phase views share.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Flag, Plus, TimerReset } from "@/components/icons";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
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
import type { Routine, SetLog, SportExercise } from "@/api/services/sport-service";
import { describeSet } from "./core";

// Finishing saves the session and leaves the runner, so ask first.
export function FinishButton({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-10 rounded-full">
          <Flag className="size-4" />
          {t("routines.finish")}
        </Button>
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

// The matching set from this routine's last run, as a small chip: the number to
// beat, kept quieter than the number being entered.
export function LastTimeChip({ set }: { set: SetLog }) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
      <TimerReset className="size-4" aria-hidden />
      {t("routines.last_time", { value: describeSet(set, t) })}
    </div>
  );
}

// One dot per set of the exercise: the ones done filled, the one on now ringed.
export function SetDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={
            index + 1 < current
              ? "size-2.5 rounded-full bg-primary"
              : index + 1 === current
                ? "size-2.5 rounded-full bg-primary/25 ring-2 ring-primary"
                : "size-2.5 rounded-full bg-foreground/15"
          }
        />
      ))}
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
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
        <ChevronDown className="size-4" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-1/2 z-20 mt-2 w-72 max-w-[85vw] -translate-x-1/2 rounded-xl border bg-popover p-1.5 text-left shadow-lg">
          {items.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                onJump(index);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium break-words hover:bg-secondary"
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

// Pick an exercise for the running workout: to add it, or (with the swap keys)
// to put it in place of the current one. Either way it changes THIS session
// only; the stored routine keeps its own items, so a spontaneous change does not
// rewrite the plan for next time.
export function AddExerciseDialog({
  exercises,
  onAdd,
  className = "w-full",
  variant = "outline",
  icon: Icon = Plus,
  size = "default",
  labelKey = "routines.add_exercise",
  titleKey = "routines.add_exercise",
  hintKey = "routines.add_exercise_hint",
}: {
  exercises: SportExercise[];
  onAdd: (exerciseId: string) => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  icon?: PhosphorIcon;
  size?: "default" | "sm";
  labelKey?: string;
  titleKey?: string;
  hintKey?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Icon className="size-4" />
          <span className="truncate">{t(labelKey)}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>{t(hintKey)}</DialogDescription>
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
