// The controls both phase views share.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
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
        onClick={() => onDelta(2.5)}
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
}

// Tap the "exercise X/Y · set N/M" header to jump to any exercise.
export function JumpHeader({
  label,
  items,
  exerciseById,
  onJump,
}: {
  label: string;
  items: Routine["items"];
  exerciseById: (id: string) => SportExercise | undefined;
  onJump: (index: number) => void;
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
        <div className="absolute left-1/2 z-10 mt-1 w-56 -translate-x-1/2 rounded-lg border bg-popover p-1 shadow-md">
          {items.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                onJump(index);
                setOpen(false);
              }}
              className="block w-full truncate rounded-md px-3 py-2 text-left text-base hover:bg-secondary"
            >
              {index + 1}. {exerciseById(entry.ex)?.name ?? "—"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
