import client from "../client";

// Read-only `find` endpoints. Shapes are loose on purpose — the app defines the
// canonical models; the panel only lists what the server returns.
export interface Workout {
  id?: string;
  name?: string;
  at?: number; // epoch ms
  sets?: unknown[];
}

export interface Training {
  id?: string;
  type?: string; // walk / jog / bike
  startMs?: number;
  endMs?: number;
  distanceM?: number;
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

const trainings = () =>
  client.get<{ success: boolean; trainings?: Training[] }>({
    url: "/sport/trainings/find/",
  });

const measurements = () =>
  client.get<{ success: boolean; entries?: Measurement[] }>({
    url: "/sport/measurements/find/",
  });

export default { workouts, trainings, measurements };
