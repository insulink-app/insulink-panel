import { useTranslation } from "react-i18next";
import { ArrowRight, TimerReset } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Routine, SetLog, SportExercise } from "@/api/services/sport-service";
import { AddExerciseDialog, JumpHeader, LastTimeChip } from "./controls";
import { RepsStepper, WeightStepper } from "./number-stepper";
import { RestRing } from "./rest-ring";

// The rest between two sets: the countdown ring, the coming set's number from
// last time, the set just done (still correctable), and the way on. What comes
// next is shown in the exercise rail.
export function RestView(props: {
  expired: boolean;
  remaining: number;
  overtime: number;
  total: number;
  endsAt: number | null;
  paused: boolean;
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
      <span className="text-sm font-bold text-brand-text">{t("routines.resting")}</span>
      <RestRing
        remaining={props.remaining}
        overtime={props.overtime}
        expired={props.expired}
        total={props.total}
        endsAt={props.endsAt}
        paused={props.paused}
      />
      {props.awaitingNext && (
        <JumpHeader
          label={t("routines.pick_next")}
          items={props.items}
          exercises={props.exercises}
          exerciseById={props.exerciseById}
          onJump={props.onJump}
          onAdd={props.onAddExercise}
        />
      )}
      {props.lastComparable && <LastTimeChip set={props.lastComparable} />}
      {props.lastSet && props.lastSet.reps != null && <PreviousSet {...props} />}
      <div className="mt-2 grid w-full max-w-[420px] grid-cols-2 gap-3">
        <Button variant="outline" className="h-[58px] bg-panel text-base hover:bg-raised" onClick={props.onExtend}>
          <TimerReset className="size-5" />
          {t("routines.extend")}
        </Button>
        {props.awaitingNext ? (
          <AddExerciseDialog
            exercises={props.exercises}
            onAdd={props.onAddExercise}
            className="h-[58px] w-full text-base font-extrabold"
            variant="default"
            labelKey="routines.next_exercise"
          />
        ) : (
          <Button className="h-[58px] text-base font-extrabold" onClick={props.onContinue}>
            <ArrowRight className="size-5" />
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
      <span className="text-sm text-muted-foreground">{t("routines.previous_set")}</span>
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-6">
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
