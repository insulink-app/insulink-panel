import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, Minus, Pause, Play, Plus, TimerReset } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import sportService, {
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

  const routine = routines.data?.routines?.find((entry) => entry.id === id);

  if (routines.isLoading || exercises.isLoading) {
    return (
      <PanelPage title={t("routines.start")}>
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </PanelPage>
    );
  }
  if (!routine || routine.items.length === 0) {
    return (
      <PanelPage title={t("routines.start")}>
        <p className="py-24 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
      </PanelPage>
    );
  }

  return (
    <Runner
      routine={routine}
      exercises={exercises.data?.exercises ?? []}
      pastWorkouts={workouts.data?.workouts ?? []}
    />
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
}: {
  routine: Routine;
  exercises: SportExercise[];
  pastWorkouts: Workout[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const exerciseById = useCallback(
    (exerciseId: string) => exercises.find((entry) => entry.id === exerciseId),
    [exercises],
  );
  const itemAt = (index: number) => routine.items[index];

  const [core, setCore] = useState<Core>(() => {
    const now = Date.now();
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
  });

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
    setCore((state) => ({ ...state, currentReps: clamp(reps) }));
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
              reps: patch.reps != null ? clamp(patch.reps) : set.reps,
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

  // Persist the finished session (append to the full workout list, then sync).
  const savedRef = useRef(false);
  useEffect(() => {
    if (core.phase !== "done" || savedRef.current) {
      return;
    }
    savedRef.current = true;
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
  }, [core.phase, core.sets, core.startedAt, pastWorkouts, queryClient, routine.id, t]);

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
    <PanelPage title={routine.name}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4">
        <VitalsBar />

        {/* progress + total time + pause */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t("routines.total")} {formatDuration(sessionElapsed)}
            </span>
            <Button variant="ghost" size="sm" onClick={() => (core.pausedAt ? resume() : pause())}>
              {core.pausedAt ? <Play className="size-4" /> : <Pause className="size-4" />}
              {core.pausedAt ? t("routines.resume") : t("routines.pause")}
            </Button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {core.phase === "done" ? (
          <DoneView
            setCount={core.sets.length}
            duration={sessionElapsed}
            onClose={() => navigate(`/health/routines/${routine.id}`)}
          />
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
      </div>
    </PanelPage>
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
    <div className="flex min-h-[62vh] flex-col items-stretch justify-center gap-6 rounded-2xl border p-8 text-center">
      <JumpHeader
        label={`${t("routines.exercise")} ${props.exerciseIndex + 1}/${props.totalExercises}  ·  ${t("routines.set")} ${props.setNumber}/${props.totalSets}`}
        items={props.items}
        exerciseById={props.exerciseById}
        onJump={props.onJump}
      />
      <div className="text-3xl font-bold">{props.name}</div>
      <div className="text-7xl font-bold tabular-nums md:text-8xl">{formatDuration(props.elapsed)}</div>

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
      <Button variant="ghost" onClick={props.onFinish}>
        {t("routines.finish")}
      </Button>
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
    <div className="flex min-h-[62vh] flex-col items-stretch justify-center gap-6 rounded-2xl border p-8 text-center">
      <span className="text-xl text-muted-foreground">{t("routines.resting")}</span>
      <div
        className="text-8xl font-bold tabular-nums"
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
      <Button variant="ghost" onClick={props.onFinish}>
        {t("routines.finish")}
      </Button>
    </div>
  );
}

function DoneView({
  setCount,
  duration,
  onClose,
}: {
  setCount: number;
  duration: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border p-8 text-center">
      <div className="text-2xl font-bold">{t("routines.done")}</div>
      <div className="text-sm text-muted-foreground">
        {t("routines.done_summary", { sets: setCount, time: formatDuration(duration) })}
      </div>
      <Button className="mt-2" onClick={onClose}>
        {t("routines.back")}
      </Button>
    </div>
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

// Latest known glucose + pulse — the panel has no live stream, so this shows the
// most recent synced readings (a static echo of the app's live vitals bar).
function VitalsBar() {
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });
  const { data: glucose } = useQuery({ queryKey: ["glucose-history"], queryFn: glucoseService.history });
  const { data: pulse } = useQuery({ queryKey: ["pulse"], queryFn: healthService.pulse });

  const latestGlucose = (glucose?.entries ?? []).reduce<{ time: number; value: number } | null>(
    (latest, entry) => (!latest || entry.time > latest.time ? entry : latest),
    null,
  );
  const latestPulse = (pulse?.samples ?? []).reduce<{ t: number; b: number } | null>(
    (latest, sample) => (!latest || sample.t > latest.t ? sample : latest),
    null,
  );
  const unit = settings?.glucose_unit;

  return (
    <div className="flex items-center justify-around rounded-xl bg-secondary/60 py-3">
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold" style={{ color: "#6366f1" }}>
          {latestGlucose ? `${toDisplay(latestGlucose.value, unit)}` : "–"}
        </span>
        <span className="text-xs text-muted-foreground">{unitLabel(unit)}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold" style={{ color: "#e0533d" }}>
          {latestPulse ? latestPulse.b : "–"}
        </span>
        <span className="text-xs text-muted-foreground">bpm</span>
      </div>
    </div>
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(999, value));
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
