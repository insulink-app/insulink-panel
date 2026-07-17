import client from "../client";

// Wire contracts mirror the app's sport_models.dart / cardio_models.dart. The
// panel reads every `find` collection and can re-sync routines (full replace).

// What an exercise records per set (drives how a set/target is displayed).
export type ExerciseKind = "reps" | "weighted" | "timed";

export interface SportExercise {
  id: string;
  name: string;
  kind: ExerciseKind;
}

// An exercise slot inside a routine. `ex` references a SportExercise id;
// `target` is reps or seconds depending on the exercise kind.
export interface RoutineItem {
  id: string;
  ex: string;
  sets: number;
  target: number;
  weight: number;
  rest: number;
}

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
}

// One logged set inside a completed workout.
export interface SetLog {
  ex: string;
  reps?: number;
  secs?: number;
  kg?: number;
  dur?: number;
  rest?: number;
  ts: number; // epoch ms
}

// A completed workout references a routine by id; the display name comes from
// resolving `routine` against the routines list.
export interface Workout {
  id: string;
  routine: string;
  started: number; // epoch ms
  sets: SetLog[];
}

// The workout currently running, shared with the app. Mirrors the app's
// `WorkoutSnapshot` (workout_snapshot.dart) field for field — whichever device
// drives the workout pushes this, so the panel can pick up a routine started on
// the phone mid-set and finish it (and vice versa). All times are epoch ms, so
// elapsed/rest recompute correctly however long ago the snapshot was written.
export type WorkoutPhase = "exercising" | "resting" | "done";

export interface ActiveWorkout {
  routine: string; // routine id
  // The driving device's own copy of the routine (ordered items + name), so a
  // follower renders the exercise/set/target the DRIVER is on instead of
  // resolving `ex`/`set` against its own copy — which shows the wrong
  // exercise/set/time the moment the two copies differ. Absent on a legacy
  // snapshot; the follower then falls back to its local routine.
  name?: string;
  items?: RoutineItem[];
  started: number;
  ex: number; // exercise index
  set: number; // set index
  phase: WorkoutPhase;
  setStarted: number;
  restEnds: number | null;
  restStarted: number | null;
  paused: number; // total paused ms
  reps: number;
  weight: number;
  sets: SetLog[];
}

export type CardioType = "walk" | "jog" | "bike";

export interface Training {
  id: string;
  type: CardioType;
  start: number; // epoch ms
  end: number; // epoch ms
  dist: number; // meters
  auto?: boolean; // auto-detected training
  track?: { lat: number; lng: number; t: number }[];
}

// Typed value+time entry. WEIGHT=kg, STEPS=count, DISTANCE=km, CALORIES=kcal.
export type MeasurementType = "WEIGHT" | "STEPS" | "DISTANCE" | "CALORIES";

export interface Measurement {
  type: MeasurementType;
  value: number;
  time: number; // epoch ms
}

const exercises = () =>
  client.get<{ success: boolean; exercises?: SportExercise[] }>({
    url: "/sport/exercises/find/",
  });

const workouts = () =>
  client.get<{ success: boolean; workouts?: Workout[] }>({
    url: "/sport/workouts/find/",
  });

const routines = () =>
  client.get<{ success: boolean; routines?: Routine[] }>({
    url: "/sport/routines/find/",
  });

const trainings = () =>
  client.get<{ success: boolean; trainings?: Training[] }>({
    url: "/sport/trainings/find/",
  });

const measurements = () =>
  client.get<{ success: boolean; entries?: Measurement[] }>({
    url: "/sport/measurements/find/",
  });

// The running workout. Unlike the collections below this is live session state,
// not an offline mirror: the panel both reads it (to resume what the app
// started) and writes it (so the app follows what the panel does).
const activeWorkout = () =>
  client.get<{ success: boolean; workout?: ActiveWorkout; updated?: number }>({
    url: "/sport/workout/active/find/",
  });

const syncActiveWorkout = (workout: ActiveWorkout) =>
  client.post<{ success: boolean; updated?: number }>({
    url: "/sport/workout/active/sync/",
    data: { workout },
  });

const clearActiveWorkout = () =>
  client.post<{ success: boolean }>({
    url: "/sport/workout/active/clear/",
  });

// Full-replace syncs (the same endpoints the app uses). The caller must send
// the complete current list — deletes/edits are expressed by omitting/changing
// entries, never a partial patch.
const syncRoutines = (list: Routine[]) =>
  client.post<{ success: boolean }>({
    url: "/sport/routines/sync/",
    data: { routines: list },
  });

const syncExercises = (list: SportExercise[]) =>
  client.post<{ success: boolean }>({
    url: "/sport/exercises/sync/",
    data: { exercises: list },
  });

const syncWorkouts = (list: Workout[]) =>
  client.post<{ success: boolean }>({
    url: "/sport/workouts/sync/",
    data: { workouts: list },
  });

const syncTrainings = (list: Training[]) =>
  client.post<{ success: boolean }>({
    url: "/sport/trainings/sync/",
    data: { trainings: list },
  });

export default {
  exercises,
  workouts,
  routines,
  trainings,
  measurements,
  activeWorkout,
  syncActiveWorkout,
  clearActiveWorkout,
  syncRoutines,
  syncExercises,
  syncWorkouts,
  syncTrainings,
};
