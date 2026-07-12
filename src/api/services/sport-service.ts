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
  syncRoutines,
  syncExercises,
  syncWorkouts,
  syncTrainings,
};
