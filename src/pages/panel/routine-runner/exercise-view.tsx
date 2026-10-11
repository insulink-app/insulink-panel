import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/icons";
import type { SetLog } from "@/api/services/sport-service";
import { formatClock } from "./core";
import { LastTimeChip } from "./controls";
import { RepsStepper, WeightStepper } from "./number-stepper";

// The set being done: its name, its stopwatch, the reps (and weight) to
// log, the number to beat from last time, and the one button that logs it.
export function ExerciseView(props: {
  name: string;
  exerciseIndex: number;
  setNumber: number;
  elapsed: number;
  isTimed: boolean;
  isWeighted: boolean;
  targetSecs: number;
  reps: number;
  weight: number;
  onReps: (reps: number) => void;
  onWeight: (delta: number) => void;
  lastComparable?: SetLog;
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
    <div className="flex flex-col items-center text-center">
      <h2 className="max-w-full text-[clamp(34px,4vw,52px)] leading-tight font-extrabold tracking-tight break-words">
        {props.name}
      </h2>
      <div className="mt-3.5 text-[clamp(96px,11vw,176px)] leading-none font-extrabold tracking-[-0.05em]">
        {formatClock(props.elapsed)}
      </div>
      {props.lastComparable && (
        <div className="mt-2.5">
          <LastTimeChip set={props.lastComparable} />
        </div>
      )}

      <div className="mt-[34px] flex flex-wrap justify-center gap-x-10 gap-y-6">
        {props.isTimed ? (
          <span className="text-base font-bold text-muted-foreground">
            {t("routines.target_time", { n: props.targetSecs })}
          </span>
        ) : (
          <>
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
          </>
        )}
      </div>

      <Button className="mt-[34px] h-[58px] w-full max-w-[420px] text-[17px] font-extrabold" onClick={props.onComplete}>
        <CheckIcon className="size-5" weight="bold" />
        {t("routines.complete_set")}
      </Button>
    </div>
  );
}
