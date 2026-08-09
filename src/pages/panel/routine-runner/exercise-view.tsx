import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Routine, SetLog, SportExercise } from "@/api/services/sport-service";
import { describeSet, formatClock } from "./core";
import { FinishButton, JumpHeader, WeightRow } from "./controls";

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
  onFinish: () => void;
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
    <div className="flex flex-1 flex-col items-stretch justify-center gap-4 text-center">
      <JumpHeader
        label={`${t("routines.exercise")} ${props.exerciseIndex + 1}/${props.totalExercises}  ·  ${t("routines.set")} ${props.setNumber}/${props.totalSets}`}
        items={props.items}
        exercises={props.exercises}
        exerciseById={props.exerciseById}
        onJump={props.onJump}
        onAdd={props.onAddExercise}
      />
      <div className="text-5xl font-bold tracking-tight">{props.name}</div>
      <div className="text-[clamp(5rem,19vw,9rem)] leading-none font-bold tracking-tight tabular-nums">
        {formatClock(props.elapsed)}
      </div>

      {props.isTimed ? (
        <div className="text-lg text-muted-foreground">
          {t("routines.target_time", { n: props.targetSecs })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span className="text-lg text-muted-foreground">{t("routines.reps")}</span>
          <Input
            ref={repsInputRef}
            type="number"
            min={0}
            value={props.reps}
            onChange={(event) => props.onReps(Number(event.target.value) || 0)}
            className="w-52 text-center text-6xl md:text-6xl font-bold h-24"
          />
          {props.isWeighted && <WeightRow weight={props.weight} onDelta={props.onWeight} />}
        </div>
      )}

      {props.lastComparable && (
        <div className="text-lg text-muted-foreground">
          {t("routines.last_time", { value: describeSet(props.lastComparable, t) })}
        </div>
      )}

      <Button className="mt-2 h-[4.5rem] text-xl" onClick={props.onComplete}>
        {t("routines.complete_set")}
      </Button>
      <FinishButton onFinish={props.onFinish} />
    </div>
  );
}
