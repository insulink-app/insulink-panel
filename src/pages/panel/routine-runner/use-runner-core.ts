// The workout state machine: every transition the runner can make, and the 1 Hz
// clock the stopwatch/countdown repaint from. No rendering, no network — the
// views drive it and use-workout-sync mirrors what comes out.
import { useEffect, useRef, useState } from "react";
import type {
  ActiveWorkout,
  Routine,
  RoutineItem,
  SetLog,
  SportExercise,
} from "@/api/services/sport-service";
import { FREE_ROUTINE_ID } from "@/lib/workout";
import { clamp, clampReps, coreFrom, type Core } from "./core";

export function useRunnerCore({
  routine,
  resumeFrom,
  exerciseById,
}: {
  routine: Routine;
  resumeFrom?: ActiveWorkout;
  exerciseById: (id: string) => SportExercise | undefined;
}) {
  const [core, setCore] = useState<Core>(() => coreFrom(resumeFrom, routine));
  const itemAt = (index: number) => routine.items[index];

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
  const enterExercising = (state: Core, at: number, entered?: RoutineItem): Core => {
    let sets = state.sets;
    if (state.restStartedAt != null && sets.length > 0) {
      const restSecs = Math.floor((at - state.restStartedAt) / 1000);
      sets = sets.map((set, index) => (index === sets.length - 1 ? { ...set, rest: restSecs } : set));
    }
    const item = entered ?? itemAt(state.exerciseIndex);
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
        // A free workout has no plan to run out of: it rests on the same set
        // instead of ending, so the user can add the next exercise, repeat this
        // one, or finish it themselves.
      } else if (routine.id !== FREE_ROUTINE_ID) {
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
      const base =
        state.restEndsAt != null && state.restEndsAt > reference ? state.restEndsAt : reference;
      return { ...state, restEndsAt: base + seconds * 1000 };
    });

  const finishEarly = () => setCore((state) => ({ ...state, phase: "done" }));

  // Take the account's snapshot over: another device is the one moving this
  // workout on. Seeded exactly like a resume, so nothing else has to know how a
  // snapshot maps onto the state machine.
  const adopt = (remote: ActiveWorkout) => setCore(coreFrom(remote, routine));

  // Start an exercise added a moment ago: the routine prop still lacks it (the
  // merge happens on the next render), so the item comes along rather than being
  // looked up by index — which would read `undefined` and throw.
  const startAdded = (index: number, item: RoutineItem) =>
    setCore((state) =>
      enterExercising({ ...state, exerciseIndex: index, setIndex: 0 }, Date.now(), item),
    );

  // Put a swapped-in exercise where the current one was: it starts over at its
  // first set. While resting only the pointer moves, so the rest runs on and the
  // swapped exercise is what comes next. The item comes along for the same reason
  // as in `startAdded`: the routine prop catches up one render later.
  const swapIn = (item: RoutineItem) =>
    setCore((state) =>
      state.phase === "exercising"
        ? enterExercising({ ...state, setIndex: 0 }, Date.now(), item)
        : { ...state, setIndex: 0 },
    );

  // Jump to any exercise, back or ahead. Going back to one this session already
  // logged prefills what was done there last, so a repeat starts from the real
  // numbers instead of the plan's.
  const jumpTo = (index: number) =>
    setCore((state) => {
      const entered = enterExercising({ ...state, exerciseIndex: index, setIndex: 0 }, Date.now());
      const done = [...state.sets].reverse().find((set) => set.ex === itemAt(index).ex);
      return {
        ...entered,
        currentReps: done?.reps ?? entered.currentReps,
        currentWeight: done?.kg ?? entered.currentWeight,
      };
    });

  const recordReps = (reps: number) => setCore((state) => ({ ...state, currentReps: clampReps(reps) }));

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

  // Enter advances: complete the current set, or skip the rest countdown. The
  // reps field keeps focus (see ExerciseView), so a set is one value typed +
  // Enter. Mounted once — the handlers drive `setCore` and read fresh state, so
  // no stale closure; a phase ref keeps the dispatch current.
  const phaseRef = useRef(core.phase);
  useEffect(() => {
    phaseRef.current = core.phase;
  }, [core.phase]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      if (phaseRef.current === "exercising") {
        completeSet();
      } else if (phaseRef.current === "resting") {
        skipRest();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    core,
    clock,
    completeSet,
    skipRest,
    extendRest,
    finishEarly,
    adopt,
    jumpTo,
    startAdded,
    swapIn,
    recordReps,
    adjustWeight,
    updateLastSet,
    pause,
    resume,
  };
}
