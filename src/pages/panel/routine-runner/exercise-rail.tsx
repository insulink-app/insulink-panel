// The workout's running order, at the right edge of the runner: every exercise
// with what has happened to it in plain words (sets done, on now, still open), and the two ways to change the plan on the spot under the current one.
import { useTranslation } from "react-i18next";
import { ArrowsLeftRight, CheckIcon, Play, SkipForward } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { RoutineItem, SetLog, SportExercise } from "@/api/services/sport-service";
import { AddExerciseDialog } from "./controls";

type RailProps = {
  items: RoutineItem[];
  exerciseIndex: number;
  setIndex: number;
  resting: boolean;
  sets: SetLog[];
  exercises: SportExercise[];
  exerciseById: (id: string) => SportExercise | undefined;
  canSkip: boolean;
  canSwap: boolean;
  onSkip: () => void;
  onSwap: (exerciseId: string) => void;
  onJump: (index: number) => void;
};

export function ExerciseRail(props: RailProps) {
  const { t } = useTranslation();
  return (
    <aside aria-label={t("routines.rail.title")} className="flex flex-col gap-3">
      <h2 className="px-3 pt-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {t("routines.rail.title")}
      </h2>
      {/* The thread through the markers makes the list read as one sequence. */}
      <ol className="relative flex flex-col gap-1 before:absolute before:top-5 before:bottom-5 before:left-[26px] before:w-px before:bg-border">
        {props.items.map((item, index) => (
          <RailStep key={item.id} item={item} index={index} {...props} />
        ))}
      </ol>
    </aside>
  );
}

// One exercise of the running order. The current one is the large, tinted row
// and carries skip and swap; the others say how many sets are logged, or what
// the plan asks for while none is.
function RailStep(props: RailProps & { item: RoutineItem; index: number }) {
  const { t } = useTranslation();
  const exercise = props.exerciseById(props.item.ex);
  const isCurrent = props.index === props.exerciseIndex;
  // ponytail: counts logged sets by exercise id, so an exercise that appears
  // twice in one routine shares its count. Track sets per item if that matters.
  const done = Math.min(
    props.item.sets,
    props.sets.filter((set) => set.ex === props.item.ex).length,
  );
  // Done is what was logged, not where the exercise sits: jumping ahead leaves
  // the ones in between open, and jumping back reopens nothing.
  const finished = !isCurrent && done >= props.item.sets;
  const status = isCurrent
    ? t(props.resting ? "routines.rail.after_rest" : "routines.rail.now", {
        set: props.setIndex + 1,
        sets: props.item.sets,
      })
    : done > 0
      ? t("routines.rail.done", { done, sets: props.item.sets })
      : prescription(props.item, exercise, t);

  return (
    <li
      aria-current={isCurrent ? "step" : undefined}
      className={
        isCurrent
          ? "relative flex flex-col gap-2 rounded-xl bg-primary/10 py-2.5 pr-2 pl-3"
          : "relative rounded-xl transition-colors hover:bg-secondary/60"
      }
    >
      <StepBody isCurrent={isCurrent} onJump={() => props.onJump(props.index)}>
        <StepMarker index={props.index} isCurrent={isCurrent} finished={finished} />
        <div className="min-w-0">
          <div className={`font-semibold break-words ${finished ? "text-muted-foreground" : ""}`}>
            {exercise?.name ?? "—"}
          </div>
          <div className={`text-sm ${isCurrent ? "font-medium text-primary" : "text-muted-foreground"}`}>
            {status}
          </div>
          {isCurrent && (
            <div className="text-sm text-muted-foreground">{prescription(props.item, exercise, t)}</div>
          )}
        </div>
      </StepBody>
      {isCurrent && (props.canSkip || props.canSwap) && <StepActions {...props} />}
    </li>
  );
}

// Any exercise but the current one is a button that jumps there, back to one
// already done as well as ahead; the current one is plain, it is where we are.
function StepBody({
  isCurrent,
  onJump,
  children,
}: {
  isCurrent: boolean;
  onJump: () => void;
  children: React.ReactNode;
}) {
  if (isCurrent) {
    return <div className="flex items-start gap-3">{children}</div>;
  }
  return (
    <button
      type="button"
      onClick={onJump}
      className="flex w-full items-start gap-3 py-2.5 pr-2 pl-3 text-left"
    >
      {children}
    </button>
  );
}

// A check for an exercise with every set logged, a play mark for the one on now,
// and its position for every other.
function StepMarker({
  index,
  isCurrent,
  finished,
}: {
  index: number;
  isCurrent: boolean;
  finished: boolean;
}) {
  const base = "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold";
  if (isCurrent) {
    return (
      <span className={`${base} bg-primary text-primary-foreground`}>
        <Play className="size-3.5" weight="fill" />
      </span>
    );
  }
  if (finished) {
    return (
      <span className={`${base} bg-secondary text-muted-foreground`}>
        <CheckIcon className="size-3.5" />
      </span>
    );
  }
  return <span className={`${base} border bg-background text-muted-foreground tabular-nums`}>{index + 1}</span>;
}

function StepActions(props: RailProps) {
  const { t } = useTranslation();
  return (
    <div className="ml-8 flex flex-wrap gap-x-1">
      {props.canSkip && (
        <Button variant="ghost" size="sm" className="h-8 px-1 text-primary" onClick={props.onSkip}>
          <SkipForward className="size-4" />
          <span className="truncate">{t("routines.rail.skip")}</span>
        </Button>
      )}
      {props.canSwap && (
        <div>
          <AddExerciseDialog
            exercises={props.exercises}
            onAdd={props.onSwap}
            icon={ArrowsLeftRight}
            variant="ghost"
            className="h-8 px-1 text-primary"
            size="sm"
            labelKey="routines.rail.swap"
            titleKey="routines.swap_exercise"
            hintKey="routines.swap_exercise_hint"
          />
        </div>
      )}
    </div>
  );
}

// What the plan asks of an exercise, spelled out: "3 sets · 12 reps · 40 kg", or
// "1 set · 30 s" for a timed one.
function prescription(
  item: RoutineItem,
  exercise: SportExercise | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const parts = [
    t("routines.rail.sets", { count: item.sets }),
    exercise?.kind === "timed"
      ? t("routines.rail.seconds", { n: item.target })
      : t("routines.rail.reps", { n: item.target }),
  ];
  if (item.weight > 0) {
    parts.push(`${item.weight} ${t("body.kg")}`);
  }
  return parts.join(" · ");
}
