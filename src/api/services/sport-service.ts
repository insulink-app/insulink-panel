import client from "../client";

// Read-only `find` endpoints. Shapes are loose on purpose — the app defines the
// canonical models; the panel only lists what the server returns.
// A logged workout has no name of its own — it references a routine by id; the
// display name comes from resolving `routine` against the routines list.
export interface Workout {
  id?: string;
  routine?: string; // routine id
  started?: number; // epoch ms
  sets?: unknown[];
}

export interface Routine {
  id?: string;
  name?: string;
}

export interface Training {
  id?: string;
  type?: string; // walk / jog / bike
  start?: number; // epoch ms
  end?: number; // epoch ms
  dist?: number; // meters
}

export interface Measurement {
  type?: string; // e.g. WEIGHT
  value?: number;
  time?: number; // epoch ms
}

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

export default { workouts, routines, trainings, measurements };
