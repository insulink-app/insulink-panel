// The workout's running order, at the right edge of the runner: every exercise
// with what has happened to it in plain words (sets done, on now, still open),
// and the two ways to change the plan on the spot under the current one.
import { useTranslation } from "react-i18next";
import { ArrowsLeftRight, CheckIcon, SkipForward } from "@/components/icons";
import type { RoutineItem, SetLog, SportExercise } from "@/api/services/sport-service";
import { formatAmount } from "@/lib/nutrition";
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

/** The pill shape of the current exercise's Skip and Swap. */
const PILL = "inline-flex h-[30px] items-center gap-1.5 rounded-full bg-panel px-3 text-[13px] font-bold text-foreground transition-colors hover:bg-raised [&_svg]:size-3";

export function ExerciseRail(props: RailProps) {
  const { t } = useTranslation();
  return (
    <aside aria-label={t("routines.rail.title")} className="flex flex-col">
      <h2 className="mb-1.5 text-base font-extrabold">{t("nav.exercises")}</h2>
      <ol className="flex flex-col divide-y divide-divider">
        {props.items.map((item, index) => (
          <RailStep key={item.id} item={item} index={index} {...props} />
        ))}
      </ol>
    </aside>
  );
}

// One exercise of the running order. The current one carries the brand bar,
// its status and skip and swap; the others say how many sets are logged, or
// what the plan asks for while none is.
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

  if (isCurrent) {
    return (
      <li aria-current="step" className="relative py-3 pr-0 pl-4">
        <i className="absolute top-3 bottom-3.5 left-0 block w-[3px] rounded-sm bg-primary" aria-hidden />
        <b className="block text-[15px] break-words">{exercise?.name ?? "—"}</b>
        <span className="block text-[13px] text-muted-foreground">{prescription(props.item, exercise, t)}</span>
        <span className="block text-[13px] font-bold text-brand-text">
          {t(props.resting ? "routines.rail.after_rest" : "routines.rail.now", {
            set: props.setIndex + 1,
            sets: props.item.sets,
          })}
        </span>
        {(props.canSkip || props.canSwap) && <StepActions {...props} />}
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => props.onJump(props.index)}
        className="flex w-full items-center gap-3 py-2.5 pl-4 text-left transition-opacity hover:opacity-80"
      >
        <span className="w-[18px] shrink-0 text-[13px] font-bold text-label">
          {finished ? <CheckIcon className="size-3.5" aria-hidden /> : props.index + 1}
        </span>
        <span className={`min-w-0 flex-1 text-sm font-bold break-words ${finished ? "text-muted-foreground" : ""}`}>
          {exercise?.name ?? "—"}
        </span>
        <span className="shrink-0 text-[13px] text-muted-foreground">
          {done > 0 ? t("routines.rail.done", { done, sets: props.item.sets }) : prescription(props.item, exercise, t)}
        </span>
      </button>
    </li>
  );
}

function StepActions(props: RailProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {props.canSkip && (
        <button type="button" className={PILL} onClick={props.onSkip}>
          <SkipForward aria-hidden />
          {t("routines.rail.skip")}
        </button>
      )}
      {props.canSwap && (
        <AddExerciseDialog
          exercises={props.exercises}
          onAdd={props.onSwap}
          icon={ArrowsLeftRight}
          variant="ghost"
          className={PILL}
          size="sm"
          labelKey="routines.rail.swap"
          titleKey="routines.swap_exercise"
          hintKey="routines.swap_exercise_hint"
        />
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
    parts.push(`${formatAmount(item.weight)} ${t("body.kg")}`);
  }
  return parts.join(" · ");
}
