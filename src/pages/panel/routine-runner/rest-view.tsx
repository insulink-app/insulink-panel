import { useTranslation } from "react-i18next";
import { ArrowRight, TimerReset } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Routine, SetLog, SportExercise } from "@/api/services/sport-service";
import { formatClock } from "./core";
import { AddExerciseDialog, FinishButton, JumpHeader, WeightRow } from "./controls";

export function RestView(props: {
  expired: boolean;
  remaining: number;
  overtime: number;
  nextName: string;
  setNumber: number;
  totalSets: number;
  items: Routine["items"];
  exercises: SportExercise[];
  exerciseById: (id: string) => SportExercise | undefined;
  onJump: (index: number) => void;
  onAddExercise: (exerciseId: string) => void;
  // A free workout that has finished its picked exercise: nothing is queued, so
  // this rest asks for the next exercise instead of offering to carry on.
  awaitingNext: boolean;
  lastSet?: SetLog;
  onUpdateLast: (patch: { reps?: number; kg?: number }) => void;
  onExtend: () => void;
  onContinue: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-stretch justify-center gap-4 text-center">
      <span className="text-lg font-medium tracking-widest text-muted-foreground uppercase">
        {t("routines.resting")}
      </span>
      <div
        className="text-[clamp(5rem,19vw,9rem)] leading-none font-bold tracking-tight tabular-nums"
        style={{ color: props.expired ? "var(--glucose-low)" : "var(--primary)" }}
      >
        {props.expired ? `+${formatClock(props.overtime)}` : formatClock(props.remaining)}
      </div>
      <JumpHeader
        label={
          props.awaitingNext
            ? t("routines.pick_next")
            : `${t("routines.next")} ${props.nextName}  ·  ${t("routines.set")} ${props.setNumber}/${props.totalSets}`
        }
        items={props.items}
        exercises={props.exercises}
        exerciseById={props.exerciseById}
        onJump={props.onJump}
        onAdd={props.onAddExercise}
      />

      {props.lastSet && props.lastSet.reps != null && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-lg text-muted-foreground">{t("routines.previous_set")}</span>
          <Input
            type="number"
            min={0}
            value={props.lastSet.reps}
            onChange={(event) => props.onUpdateLast({ reps: Number(event.target.value) || 0 })}
            className="w-52 text-center text-6xl md:text-6xl font-bold h-24"
          />
          {props.lastSet.kg != null && (
            <WeightRow
              weight={props.lastSet.kg}
              onDelta={(delta) => props.onUpdateLast({ kg: (props.lastSet?.kg ?? 0) + delta })}
            />
          )}
        </div>
      )}

      <div className="mt-2 flex gap-3">
        <Button variant="outline" className="h-[4.5rem] flex-1 text-lg" onClick={props.onExtend}>
          <TimerReset className="size-6" />
          {t("routines.extend")}
        </Button>
        {props.awaitingNext ? (
          <div className="flex-1">
            <AddExerciseDialog
              exercises={props.exercises}
              onAdd={props.onAddExercise}
              className="h-[4.5rem] w-full text-lg"
              variant="default"
              labelKey="routines.next_exercise"
            />
          </div>
        ) : (
          <Button className="h-[4.5rem] flex-1 text-lg" onClick={props.onContinue}>
            <ArrowRight className="size-6" />
            {t("routines.continue")}
          </Button>
        )}
      </div>
      <FinishButton onFinish={props.onFinish} />
    </div>
  );
}
