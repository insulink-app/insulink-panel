import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Routine, SetLog, SportExercise } from "@/api/services/sport-service";
import { formatClock } from "./core";
import { JumpHeader, LastTimeChip, SetDots } from "./controls";
import { RepsStepper, WeightStepper } from "./number-stepper";

// The set being done: which one it is, its stopwatch, the reps (and weight) to
// log, the number to beat from last time, and the one button that logs it.
export function ExerciseView(props: {
  name: string;
  exerciseIndex: number;
  totalExercises: number;
  setNumber: number;
  totalSets: number;
  elapsed: number;
  isTimed: boolean;
  isWeighted: boolean;
  targetSecs: number;
  reps: number;
  weight: number;
  onReps: (reps: number) => void;
  onWeight: (delta: number) => void;
  lastComparable?: SetLog;
  items: Routine["items"];
  exercises: SportExercise[];
  exerciseById: (id: string) => SportExercise | undefined;
  onJump: (index: number) => void;
  onAddExercise: (exerciseId: string) => void;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  // Refocus (and select) the reps field on every new set so Enter alone logs it.
  const repsInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!props.isTimed) {
      repsInputRef.current?.focus();
      repsInputRef.current?.select();
    }
  }, [props.exerciseIndex, props.setNumber, props.isTimed]);
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <JumpHeader
        label={`${t("routines.exercise")} ${props.exerciseIndex + 1}/${props.totalExercises}  ·  ${t("routines.set")} ${props.setNumber}/${props.totalSets}`}
        items={props.items}
        exercises={props.exercises}
        exerciseById={props.exerciseById}
        onJump={props.onJump}
        onAdd={props.onAddExercise}
      />
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-4xl font-bold tracking-tight break-words sm:text-5xl">{props.name}</h2>
        <SetDots current={props.setNumber} total={props.totalSets} />
      </div>
      <div className="text-[clamp(4.5rem,14vw,8rem)] leading-none font-bold tracking-tight tabular-nums">
        {formatClock(props.elapsed)}
      </div>
      {props.lastComparable && <LastTimeChip set={props.lastComparable} />}

      {props.isTimed ? (
        <div className="rounded-full bg-secondary px-4 py-1.5 text-base font-medium text-muted-foreground">
          {t("routines.target_time", { n: props.targetSecs })}
        </div>
      ) : (
        <div className={`grid w-full gap-3 ${props.isWeighted ? "sm:grid-cols-2" : "max-w-xs"}`}>
          <RepsStepper
            label={t("routines.reps")}
            decreaseLabel={t("routines.reps_down")}
            increaseLabel={t("routines.reps_up")}
            reps={props.reps}
            onReps={props.onReps}
            inputRef={repsInputRef}
          />
          {props.isWeighted && (
            <WeightStepper
              label={t("routines.weight")}
              decreaseLabel={t("routines.weight_down")}
              increaseLabel={t("routines.weight_up")}
              unit={t("body.kg")}
              weight={props.weight}
              onDelta={props.onWeight}
            />
          )}
        </div>
      )}

      <Button className="mt-2 h-16 w-full rounded-xl text-xl" onClick={props.onComplete}>
        {t("routines.complete_set")}
      </Button>
    </div>
  );
}
