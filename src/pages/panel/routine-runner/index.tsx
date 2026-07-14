import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Droplet,
  Heart,
  Minus,
  Pause,
  Play,
  Plus,
  TimerReset,
} from "lucide-react";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import sportService, {
  type ActiveWorkout,
  type Routine,
  type SetLog,
  type SportExercise,
  type Workout,
} from "@/api/services/sport-service";
import glucoseService from "@/api/services/glucose-service";
import healthService from "@/api/services/health-service";
import { toDisplay, unitLabel } from "@/lib/glucose";
import settingsService from "@/api/services/settings-service";

export default function RoutineRunnerPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: sportService.exercises });
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  // Settled before mounting the runner: it seeds its state from this once, so
  // arriving late would start a second workout over the one already running.
  const active = useQuery({ queryKey: ["active-workout"], queryFn: sportService.activeWorkout });

  const routine = routines.data?.routines?.find((entry) => entry.id === id);

  if (routines.isLoading || exercises.isLoading || active.isLoading) {
    return (
      <RunnerShell>
        <CardSkeleton />
      </RunnerShell>
    );
  }
  if (!routine || routine.items.length === 0) {
    return (
      <RunnerShell>
        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("common.no_data")}
        </p>
      </RunnerShell>
    );
  }

  const running = active.data?.workout;
  return (
    <Runner
      routine={routine}
      exercises={exercises.data?.exercises ?? []}
      pastWorkouts={workouts.data?.workouts ?? []}
      resumeFrom={running?.routine === routine.id ? running : undefined}
    />
  );
}

// Full-screen chrome: no sidebar while training, just a way back out.
function RunnerShell({
  routineId,
  routineName,
  children,
}: {
  routineId?: string;
  routineName?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const backTarget = routineId ? `/health/routines/${routineId}` : "/health/routines";
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/85 px-4 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link to={backTarget} aria-label={t("common.back")}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/health/routines">{t("routines.title")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {routineId && routineName && (
              <>
                <BreadcrumbItem className="hidden sm:block">
                  <BreadcrumbLink asChild>
                    <Link to={`/health/routines/${routineId}`}>{routineName}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{t("routines.start")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-6">{children}</div>
    </div>
  );
}

type Phase = "exercising" | "resting" | "done";

type Core = {
  phase: Phase;
  exerciseIndex: number;
  setIndex: number;
  currentReps: number;
  currentWeight: number;
  startedAt: number;
  setStartedAt: number;
  restEndsAt: number | null;
  restStartedAt: number | null;
  pausedAt: number | null;
  pausedTotal: number;
  sets: SetLog[];
};

function Runner({
  routine,
  exercises,
  pastWorkouts,
  resumeFrom,
}: {
  routine: Routine;
  exercises: SportExercise[];
  pastWorkouts: Workout[];
  resumeFrom?: ActiveWorkout;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const exerciseById = useCallback(
    (exerciseId: string) => exercises.find((entry) => entry.id === exerciseId),
    [exercises],
  );
  const itemAt = (index: number) => routine.items[index];

  const [core, setCore] = useState<Core>(() => coreFrom(resumeFrom, routine));

  // 1 Hz clock so stopwatch/countdown repaint; frozen value read below when paused.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (core.phase === "done") {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [core.phase]);
  const clock = core.pausedAt ?? now;

  // Enter the exercising phase for whatever exercise/set the pointers hold,
  // stamping the rest just taken onto the last logged set.
  const enterExercising = (state: Core, at: number): Core => {
    let sets = state.sets;
    if (state.restStartedAt != null && sets.length > 0) {
      const restSecs = Math.floor((at - state.restStartedAt) / 1000);
      sets = sets.map((set, index) =>
        index === sets.length - 1 ? { ...set, rest: restSecs } : set,
      );
    }
    const item = itemAt(state.exerciseIndex);
    return {
      ...state,
      sets,
      phase: "exercising",
      restEndsAt: null,
      restStartedAt: null,
      setStartedAt: at,
      currentReps: item.target,
      currentWeight: item.weight,
    };
  };

  const completeSet = () =>
    setCore((state) => {
      if (state.phase !== "exercising") {
        return state;
      }
      const item = itemAt(state.exerciseIndex);
      const kind = exerciseById(item.ex)?.kind;
      const at = Date.now();
      const elapsedSecs = Math.floor((at - state.setStartedAt) / 1000);
      const logged: SetLog = {
        ex: item.ex,
        reps: kind === "timed" ? undefined : state.currentReps,
        secs: kind === "timed" ? elapsedSecs : undefined,
        kg: kind === "weighted" ? state.currentWeight : undefined,
        dur: elapsedSecs,
        ts: at,
      };
      const sets = [...state.sets, logged];

      let exerciseIndex = state.exerciseIndex;
      let setIndex = state.setIndex;
      if (setIndex + 1 < item.sets) {
        setIndex += 1;
      } else if (exerciseIndex + 1 < routine.items.length) {
        exerciseIndex += 1;
        setIndex = 0;
      } else {
        return { ...state, sets, phase: "done" };
      }

      const advanced = { ...state, sets, exerciseIndex, setIndex };
      if (item.rest > 0) {
        return {
          ...advanced,
          phase: "resting",
          restStartedAt: at,
          restEndsAt: at + item.rest * 1000,
        };
      }
      return enterExercising(advanced, at);
    });

  const skipRest = () =>
    setCore((state) => (state.phase === "resting" ? enterExercising(state, Date.now()) : state));

  const extendRest = (seconds: number) =>
    setCore((state) => {
      if (state.phase !== "resting") {
        return state;
      }
      const reference = state.pausedAt ?? Date.now();
      const base = state.restEndsAt != null && state.restEndsAt > reference ? state.restEndsAt : reference;
      return { ...state, restEndsAt: base + seconds * 1000 };
    });

  const finishEarly = () => setCore((state) => ({ ...state, phase: "done" }));

  const jumpTo = (index: number) =>
    setCore((state) =>
      enterExercising({ ...state, exerciseIndex: index, setIndex: 0 }, Date.now()),
    );

  const recordReps = (reps: number) =>
    setCore((state) => ({ ...state, currentReps: clampReps(reps) }));
  const adjustWeight = (delta: number) =>
    setCore((state) => ({ ...state, currentWeight: clamp(state.currentWeight + delta) }));

  const updateLastSet = (patch: { reps?: number; kg?: number }) =>
    setCore((state) => {
      if (state.sets.length === 0) {
        return state;
      }
      const sets = state.sets.map((set, index) =>
        index === state.sets.length - 1
          ? {
              ...set,
              reps: patch.reps != null ? clampReps(patch.reps) : set.reps,
              kg: patch.kg != null ? clamp(patch.kg) : set.kg,
            }
          : set,
      );
      return { ...state, sets };
    });

  const pause = () => setCore((state) => (state.pausedAt ? state : { ...state, pausedAt: Date.now() }));
  const resume = () =>
    setCore((state) => {
      if (state.pausedAt == null) {
        return state;
      }
      const delta = Date.now() - state.pausedAt;
      return {
        ...state,
        pausedTotal: state.pausedTotal + delta,
        setStartedAt: state.setStartedAt + delta,
        restEndsAt: state.restEndsAt != null ? state.restEndsAt + delta : null,
        restStartedAt: state.restStartedAt != null ? state.restStartedAt + delta : null,
        pausedAt: null,
      };
    });

  // Follow the account so a workout ended on the phone ends here too. Only the
  // ending is adopted, never the state: this tab drives the workout while it is
  // open, and applying a snapshot mid-set would fight the user's own input.
  const active = useQuery({
    queryKey: ["active-workout"],
    queryFn: sportService.activeWorkout,
    refetchInterval: 5000,
  });

  // Set once the account is seen holding *our* workout. Without it the very
  // first poll — before the mirror below has pushed anything — reads as "ended
  // elsewhere" and closes the runner the moment it opens.
  const confirmedRef = useRef(false);
  const abandonedRef = useRef(false);
  useEffect(() => {
    if (core.phase === "done" || abandonedRef.current) {
      return;
    }
    const remote = active.data?.workout;
    if (remote?.started === core.startedAt) {
      confirmedRef.current = true;
      return;
    }
    if (!confirmedRef.current) {
      return;
    }
    // The account moved on: our workout was finished, or another one replaced
    // it. Leave without saving — whoever ended it already logged the session.
    abandonedRef.current = true;
    toast.info(t("routines.ended_elsewhere"));
    navigate(`/health/routines/${routine.id}`);
  }, [active.data, core.phase, core.startedAt, navigate, routine.id, t]);

  // Mirror every change to the account so the app follows along and can take the
  // workout back over. `core` only changes on a real interaction (the 1 Hz clock
  // is separate state), so this is one write per action — debounced so holding
  // the rep/weight buttons does not send a request per tap. Best-effort, like
  // the app's own push: a failed mirror must not interrupt the workout, and the
  // next action re-sends the full snapshot anyway.
  useEffect(() => {
    if (core.phase === "done" || abandonedRef.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      // Re-checked at fire time, not just when armed: the workout may have been
      // ended elsewhere during the wait, and pushing now would recreate the one
      // the other device just finished.
      if (abandonedRef.current) {
        return;
      }
      sportService.syncActiveWorkout(snapshotOf(core, routine.id)).catch(() => undefined);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [core, routine.id]);

  // Persist the finished session (append to the full workout list, then sync),
  // end the shared workout so no device offers to resume it afterwards, and
  // leave for the activity list — the requests below outlive the unmount.
  // Finishing cancels the armed mirror above (its cleanup runs first), so no
  // snapshot lands after the clear. ponytail: a mirror already in flight when
  // the user finishes still could, leaving a workout that resumes to a finished
  // session — a `clear` that fences later writes by timestamp fixes it if it
  // ever shows up in practice.
  const savedRef = useRef(false);
  useEffect(() => {
    if (core.phase !== "done" || savedRef.current) {
      return;
    }
    savedRef.current = true;
    sportService
      .clearActiveWorkout()
      .then(() => queryClient.invalidateQueries({ queryKey: ["active-workout"] }))
      .catch(() => undefined);
    const session: Workout = {
      id: core.startedAt.toString(36),
      routine: routine.id,
      started: core.startedAt,
      sets: core.sets,
    };
    sportService
      .syncWorkouts([...pastWorkouts, session])
      .then((res) => {
        if (res.success) {
          toast.success(t("routines.workout_saved"));
          queryClient.invalidateQueries({ queryKey: ["workouts"] });
        } else {
          toast.error(t("routines.save_failed"));
        }
      })
      .catch(() => toast.error(t("routines.save_failed")));
    navigate("/health/activity");
  }, [core.phase, core.sets, core.startedAt, navigate, pastWorkouts, queryClient, routine.id, t]);

  const item = itemAt(core.exerciseIndex);
  const exercise = exerciseById(item.ex);
  const isTimed = exercise?.kind === "timed";
  const isWeighted = exercise?.kind === "weighted";
  const plannedSets = routine.items.reduce((sum, entry) => sum + entry.sets, 0);
  const progress = plannedSets === 0 ? 0 : Math.min(1, core.sets.length / plannedSets);

  const setElapsed = Math.max(0, Math.floor((clock - core.setStartedAt) / 1000));
  const restRemaining = core.restEndsAt != null ? Math.max(0, Math.round((core.restEndsAt - clock) / 1000)) : 0;
  const restOvertime = core.restEndsAt != null ? Math.max(0, Math.round((clock - core.restEndsAt) / 1000)) : 0;
  const sessionElapsed = Math.max(0, Math.floor((clock - core.startedAt - core.pausedTotal) / 1000));

  const lastComparable = useMemo(
    () => findLastSet(pastWorkouts, item.ex, core.setIndex),
    [pastWorkouts, item.ex, core.setIndex],
  );

  const lastSet = core.sets[core.sets.length - 1];

  return (
    <RunnerShell routineId={routine.id} routineName={routine.name || t("routines.untitled")}>
      <div className="flex flex-col gap-4">
        {/* The elapsed time is the anchor, so it sits centred. The pause button
            is parked at the edge rather than laid out beside it — in a row the
            time would drift off-centre as digits are added. */}
        <div className="relative flex flex-col items-center gap-0.5">
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {t("routines.total")}
          </span>
          <span className="text-3xl leading-none font-bold tracking-tight tabular-nums">
            {formatDuration(sessionElapsed)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full"
            aria-label={core.pausedAt ? t("routines.resume") : t("routines.pause")}
            onClick={() => (core.pausedAt ? resume() : pause())}
          >
            {core.pausedAt ? <Play className="size-5" /> : <Pause className="size-5" />}
          </Button>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <VitalsTiles />
      </div>

      {core.phase === "done" ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : core.phase === "resting" ? (
        <RestView
          expired={restRemaining === 0}
          remaining={restRemaining}
          overtime={restOvertime}
          nextName={exercise?.name ?? "—"}
          setNumber={core.setIndex + 1}
          totalSets={item.sets}
          items={routine.items}
          exerciseById={exerciseById}
          onJump={jumpTo}
          lastSet={lastSet}
          onUpdateLast={updateLastSet}
          onExtend={() => extendRest(60)}
          onContinue={skipRest}
          onFinish={finishEarly}
        />
      ) : (
        <ExerciseView
          name={exercise?.name ?? "—"}
          exerciseIndex={core.exerciseIndex}
          totalExercises={routine.items.length}
          setNumber={core.setIndex + 1}
          totalSets={item.sets}
          elapsed={setElapsed}
          isTimed={isTimed}
          isWeighted={isWeighted}
          targetSecs={item.target}
          reps={core.currentReps}
          weight={core.currentWeight}
          onReps={recordReps}
          onWeight={adjustWeight}
          lastComparable={lastComparable}
          items={routine.items}
          exerciseById={exerciseById}
          onJump={jumpTo}
          onComplete={completeSet}
          onFinish={finishEarly}
        />
      )}
    </RunnerShell>
  );
}

function ExerciseView(props: {
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
  exerciseById: (id: string) => SportExercise | undefined;
  onJump: (index: number) => void;
  onComplete: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-stretch justify-center gap-6 text-center">
      <JumpHeader
        label={`${t("routines.exercise")} ${props.exerciseIndex + 1}/${props.totalExercises}  ·  ${t("routines.set")} ${props.setNumber}/${props.totalSets}`}
        items={props.items}
        exerciseById={props.exerciseById}
        onJump={props.onJump}
      />
      <div className="text-3xl font-bold tracking-tight">{props.name}</div>
      <div className="text-[clamp(4rem,17vw,8rem)] leading-none font-bold tracking-tight tabular-nums">
        {formatDuration(props.elapsed)}
      </div>

      {props.isTimed ? (
        <div className="text-sm text-muted-foreground">
          {t("routines.target_time", { n: props.targetSecs })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm text-muted-foreground">{t("routines.reps")}</span>
          <Input
            type="number"
            min={0}
            value={props.reps}
            onChange={(event) => props.onReps(Number(event.target.value) || 0)}
            className="w-28 text-center text-2xl font-bold h-12"
          />
          {props.isWeighted && (
            <WeightRow weight={props.weight} onDelta={props.onWeight} />
          )}
        </div>
      )}

      {props.lastComparable && (
        <div className="text-sm text-muted-foreground">
          {t("routines.last_time", { value: describeSet(props.lastComparable) })}
        </div>
      )}

      <Button className="mt-2 h-14 text-base" onClick={props.onComplete}>
        {t("routines.complete_set")}
      </Button>
      <FinishButton onFinish={props.onFinish} />
    </div>
  );
}

function RestView(props: {
  expired: boolean;
  remaining: number;
  overtime: number;
  nextName: string;
  setNumber: number;
  totalSets: number;
  items: Routine["items"];
  exerciseById: (id: string) => SportExercise | undefined;
  onJump: (index: number) => void;
  lastSet?: SetLog;
  onUpdateLast: (patch: { reps?: number; kg?: number }) => void;
  onExtend: () => void;
  onContinue: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-stretch justify-center gap-6 text-center">
      <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
        {t("routines.resting")}
      </span>
      <div
        className="text-[clamp(4rem,17vw,8rem)] leading-none font-bold tracking-tight tabular-nums"
        style={{ color: props.expired ? "var(--glucose-low)" : "var(--primary)" }}
      >
        {props.expired ? `+${formatDuration(props.overtime)}` : formatDuration(props.remaining)}
      </div>
      <JumpHeader
        label={`${t("routines.next")} ${props.nextName}  ·  ${t("routines.set")} ${props.setNumber}/${props.totalSets}`}
        items={props.items}
        exerciseById={props.exerciseById}
        onJump={props.onJump}
      />

      {props.lastSet && props.lastSet.reps != null && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm text-muted-foreground">{t("routines.previous_set")}</span>
          <Input
            type="number"
            min={0}
            value={props.lastSet.reps}
            onChange={(event) => props.onUpdateLast({ reps: Number(event.target.value) || 0 })}
            className="w-28 text-center text-xl font-bold h-11"
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
        <Button variant="outline" className="h-14 flex-1" onClick={props.onExtend}>
          <TimerReset className="size-5" />
          {t("routines.extend")}
        </Button>
        <Button className="h-14 flex-1" onClick={props.onContinue}>
          <ArrowRight className="size-5" />
          {t("routines.continue")}
        </Button>
      </div>
      <FinishButton onFinish={props.onFinish} />
    </div>
  );
}

// Finishing saves the session and leaves the runner, so ask first.
function FinishButton({ onFinish }: { onFinish: () => void }) {
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

function WeightRow({ weight, onDelta }: { weight: number; onDelta: (delta: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="icon" className="rounded-full" onClick={() => onDelta(-2.5)}>
        <Minus className="size-4" />
      </Button>
      <span className="w-24 text-xl font-bold tabular-nums">{weight.toFixed(1)} kg</span>
      <Button variant="outline" size="icon" className="rounded-full" onClick={() => onDelta(2.5)}>
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

// Tap the "exercise X/Y · set N/M" header to jump to any exercise.
function JumpHeader({
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
        className="w-full text-sm text-muted-foreground hover:text-foreground"
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
              className="block w-full truncate rounded-md px-3 py-1.5 text-left text-sm hover:bg-secondary"
            >
              {index + 1}. {exerciseById(entry.ex)?.name ?? "—"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Live glucose + pulse. The pulse comes from the phone's live relay rather than
// the stored curve: the band delivers ~1 Hz, and reading it back at that rate
// means one tiny value, not the whole (minute-resolution) history on every poll.
// An absent `b` already means "not live" — the backend drops a stale reading —
// so there is no staleness gate to get wrong here.
function VitalsTiles() {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });
  const { data: glucose } = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
    refetchInterval: 60000,
  });
  const { data: live } = useQuery({
    queryKey: ["live-pulse"],
    queryFn: healthService.livePulse,
    refetchInterval: 1000,
  });

  const latestGlucose = (glucose?.entries ?? []).reduce<{ time: number; value: number } | null>(
    (latest, entry) => (!latest || entry.time > latest.time ? entry : latest),
    null,
  );
  const bpm = live?.b;
  const unit = settings?.glucose_unit;

  return (
    <div className="grid grid-cols-2 gap-3">
      <VitalTile
        icon={<Droplet className="size-4" />}
        value={latestGlucose ? toDisplay(latestGlucose.value, unit) : "–"}
        unit={unitLabel(unit)}
        color="#6366f1"
      />
      <VitalTile
        icon={<Heart className="size-4" />}
        value={bpm ?? "–"}
        unit="bpm"
        color="#e0533d"
      />
    </div>
  );
}

// One vital, sized to be read at arm's length mid-set rather than leaned into.
function VitalTile({
  icon,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border bg-card px-4 py-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        {unit}
      </span>
      <span className="text-3xl leading-none font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// Seeds the runner: from the account's running workout when the app (or another
// tab) already started this routine, otherwise a fresh session. The pointers are
// clamped because the routine may have been shortened since the workout began,
// and an out-of-range pointer would read an undefined item.
function coreFrom(resume: ActiveWorkout | undefined, routine: Routine): Core {
  const now = Date.now();
  if (!resume) {
    const first = routine.items[0];
    return {
      phase: "exercising",
      exerciseIndex: 0,
      setIndex: 0,
      currentReps: first.target,
      currentWeight: first.weight,
      startedAt: now,
      setStartedAt: now,
      restEndsAt: null,
      restStartedAt: null,
      pausedAt: null,
      pausedTotal: 0,
      sets: [],
    };
  }
  const exerciseIndex = Math.min(Math.max(resume.ex, 0), routine.items.length - 1);
  const item = routine.items[exerciseIndex];
  return {
    // A finished workout is cleared, so a snapshot never resumes as "done".
    phase: resume.phase === "done" ? "exercising" : resume.phase,
    exerciseIndex,
    setIndex: Math.min(Math.max(resume.set, 0), Math.max(item.sets - 1, 0)),
    currentReps: resume.reps,
    currentWeight: resume.weight,
    startedAt: resume.started,
    setStartedAt: resume.setStarted,
    restEndsAt: resume.restEnds,
    restStartedAt: resume.restStarted,
    // The snapshot carries the paused total, not a paused-since stamp, so a
    // workout paused on the phone resumes running here — the same way the app
    // resumes its own snapshot after a restart.
    pausedAt: null,
    pausedTotal: resume.paused,
    sets: resume.sets,
  };
}

function snapshotOf(core: Core, routineId: string): ActiveWorkout {
  return {
    routine: routineId,
    started: core.startedAt,
    ex: core.exerciseIndex,
    set: core.setIndex,
    phase: core.phase,
    setStarted: core.setStartedAt,
    restEnds: core.restEndsAt,
    restStarted: core.restStartedAt,
    paused: core.pausedTotal,
    reps: core.currentReps,
    weight: core.currentWeight,
    sets: core.sets,
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(999, value));
}

// Reps are whole. The number input happily yields "12.5", and the app decodes
// reps as an int — a fractional value makes its parse of the snapshot we push
// (and of the saved workout) throw, on the phone, with no clue why.
function clampReps(value: number) {
  return Math.round(clamp(value));
}

// The setIndex-th set of `exerciseId` from the most recent past session that has
// one — the "last time" comparison.
function findLastSet(workouts: Workout[], exerciseId: string, setIndex: number) {
  const sessions = workouts.slice().sort((left, right) => right.started - left.started);
  for (const session of sessions) {
    const matching = session.sets.filter((set) => set.ex === exerciseId);
    if (matching.length > setIndex) {
      return matching[setIndex];
    }
  }
  return undefined;
}

function describeSet(set: SetLog) {
  if (set.secs != null && set.reps == null) {
    return formatDuration(set.secs);
  }
  const reps = set.reps ?? 0;
  if (set.kg != null && set.kg > 0) {
    return `${reps} × ${set.kg} kg`;
  }
  return String(reps);
}

function formatDuration(totalSeconds: number) {
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => value.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}
