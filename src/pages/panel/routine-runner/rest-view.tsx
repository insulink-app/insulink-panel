import { useTranslation } from "react-i18next";
import { ArrowRight, TimerReset } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Routine, SetLog, SportExercise } from "@/api/services/sport-service";
import { AddExerciseDialog, JumpHeader, LastTimeChip } from "./controls";
import { RepsStepper, WeightStepper } from "./number-stepper";
import { RestRing } from "./rest-ring";

// The rest between two sets: the countdown ring, what comes next and its number
// from last time, the set just done (still correctable), and the way on.
export function RestView(props: {
  expired: boolean;
  remaining: number;
  overtime: number;
  total: number;
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
  // The coming set from this routine's previous run, so the number to beat is
  // known before the set starts.
  lastComparable?: SetLog;
  lastSet?: SetLog;
  onUpdateLast: (patch: { reps?: number; kg?: number }) => void;
  onExtend: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {t("routines.resting")}
      </span>
      <RestRing
        remaining={props.remaining}
        overtime={props.overtime}
        expired={props.expired}
        total={props.total}
      />
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
      {props.lastComparable && <LastTimeChip set={props.lastComparable} />}
      {props.lastSet && props.lastSet.reps != null && <PreviousSet {...props} />}
      <div className="mt-2 grid w-full grid-cols-2 gap-3">
        <Button variant="outline" className="h-16 rounded-xl text-lg" onClick={props.onExtend}>
          <TimerReset className="size-6" />
          {t("routines.extend")}
        </Button>
        {props.awaitingNext ? (
          <AddExerciseDialog
            exercises={props.exercises}
            onAdd={props.onAddExercise}
            className="h-16 w-full rounded-xl text-lg"
            variant="default"
            labelKey="routines.next_exercise"
          />
        ) : (
          <Button className="h-16 rounded-xl text-lg" onClick={props.onContinue}>
            <ArrowRight className="size-6" />
            {t("routines.continue")}
          </Button>
        )}
      </div>
    </div>
  );
}

// The set just logged, still open to correction: reps are often only known
// once it is over.
function PreviousSet(props: {
  lastSet?: SetLog;
  onUpdateLast: (patch: { reps?: number; kg?: number }) => void;
}) {
  const { t } = useTranslation();
  const lastSet = props.lastSet!;
  return (
    <div className="flex w-full flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">{t("routines.previous_set")}</span>
      <div className={`grid gap-3 ${lastSet.kg != null ? "sm:grid-cols-2" : "mx-auto w-full max-w-xs"}`}>
        <RepsStepper
          label={t("routines.reps")}
          decreaseLabel={t("routines.reps_down")}
          increaseLabel={t("routines.reps_up")}
          reps={lastSet.reps ?? 0}
          onReps={(reps) => props.onUpdateLast({ reps })}
        />
        {lastSet.kg != null && (
          <WeightStepper
            label={t("routines.weight")}
            decreaseLabel={t("routines.weight_down")}
            increaseLabel={t("routines.weight_up")}
            unit={t("body.kg")}
            weight={lastSet.kg}
            onDelta={(delta) => props.onUpdateLast({ kg: (lastSet.kg ?? 0) + delta })}
          />
        )}
      </div>
    </div>
  );
}
