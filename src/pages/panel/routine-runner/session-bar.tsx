// The workout as a whole: the routine's name with how far it has come, the two
// controls that act on the whole session (pause, finish), and a player-style
// timeline: time so far, one segment per exercise sized by its sets, and when
// it should end.
import { useTranslation } from "react-i18next";
import { Pause, Play } from "@/components/icons";
import type { RoutineItem } from "@/api/services/sport-service";
import { formatClock } from "./core";
import { FinishButton } from "./controls";

export function SessionHeader(props: {
  name: string;
  exerciseNumber: number;
  totalExercises: number;
  doneSets: number;
  plannedSets: number;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight break-words">{props.name}</h1>
        <span className="mt-1 block text-sm text-muted-foreground">
          {t("routines.session_progress", {
            exercise: props.exerciseNumber,
            exercises: props.totalExercises,
            done: props.doneSets,
            planned: props.plannedSets,
          })}
        </span>
      </div>
      <button
        type="button"
        aria-label={props.paused ? t("routines.resume") : t("routines.pause")}
        onClick={props.paused ? props.onResume : props.onPause}
        className={`grid size-11 place-items-center rounded-full transition-colors ${props.paused ? "bg-primary text-primary-foreground" : "bg-panel text-foreground hover:bg-raised"}`}
      >
        {props.paused ? <Play size={17} weight="fill" aria-hidden /> : <Pause size={17} weight="fill" aria-hidden />}
      </button>
      <FinishButton onFinish={props.onFinish} />
    </div>
  );
}

export function SessionTimeline(props: {
  elapsed: number;
  items: RoutineItem[];
  exerciseIndex: number;
  /** How full the current exercise's segment is, 0..1 (see segmentFill). */
  currentFill: number;
  doneSets: number;
  plannedSets: number;
  expectedEnd: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-[22px] flex items-center gap-4">
      <b role="timer" aria-label={t("routines.total")} className="text-base">
        {formatClock(props.elapsed)}
      </b>
      {/* Keyed by the current exercise: a switch re-mounts the segments at
          their new fill instead of easing each one there on its own. */}
      <div
        key={props.exerciseIndex}
        role="progressbar"
        aria-label={t("routines.workout_progress")}
        aria-valuemin={0}
        aria-valuenow={props.doneSets}
        aria-valuemax={props.plannedSets}
        className="flex min-w-0 flex-1 gap-1"
      >
        {props.items.map((item, index) => (
          <TimelineSegment
            key={item.id}
            sets={item.sets}
            filled={
              index < props.exerciseIndex
                ? 1
                : index === props.exerciseIndex
                  ? props.currentFill
                  : 0
            }
          />
        ))}
      </div>
      {props.expectedEnd && (
        <span className="text-sm whitespace-nowrap text-muted-foreground">
          {t("routines.ends")} <b className="text-base text-foreground">{props.expectedEnd}</b>
        </span>
      )}
    </div>
  );
}

/**
 * One exercise of the timeline, as wide as it has sets. The fill eases over
 * the clock's one-second step, so it glides instead of jumping. It scales
 * rather than resizes: a width snaps to whole pixels and stutters, a transform
 * moves in sub-pixels on the compositor.
 */
function TimelineSegment({ sets, filled }: { sets: number; filled: number }) {
  return (
    <span className="block h-2 overflow-hidden rounded bg-divider" style={{ flexGrow: Math.max(1, sets), flexBasis: 0 }}>
      <i
        className="block h-full origin-left bg-primary transition-transform duration-1000 ease-linear will-change-transform motion-reduce:transition-none"
        style={{ transform: `scaleX(${Math.min(1, filled)})` }}
      />
    </span>
  );
}
