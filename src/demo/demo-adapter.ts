// The demo build's stand-in for the API: an axios adapter answering every `/v1`
// call from a generated in-memory account. Writes land in that memory, so edits
// stick until the tab reloads.
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { demoEvents, demoGlucose, demoMeals, demoPods, demoPrediction, demoSensors, demoSettings } from "./clinical-data";
import { DEMO_PRODUCTS, demoDrinks, demoHealthDays, demoPulse } from "./lifestyle-data";
import { DEMO_EXERCISES, DEMO_ROUTINES, demoMeasurements, demoTrainings, demoWorkouts } from "./sport-data";
import { between, NOW } from "./random";

type Body = Record<string, unknown>;

const meals = demoMeals();
const glucose = demoGlucose(meals);
const sensors = demoSensors();
const pumps = demoPods();
const TOKENS = { success: true, name: "Demo", authentication_token: "demo", refresh_token: "demo" };

/** What every read endpoint returns, keyed by its path. Syncs overwrite it. */
const reads: Record<string, Body> = {
  "/glucose/history/": { success: true, entries: glucose },
  "/event/history/": { success: true, entries: demoEvents(glucose, NOW - 3 * 86_400_000) },
  "/sensor/history/": { success: true, sensors },
  "/sensor/current/": { success: true, ...sensors[sensors.length - 1], type: "DEXCOM_G7" },
  "/pump/history/": { success: true, pumps },
  "/pump/current/": { success: true, ...pumps[pumps.length - 1] },
  "/user/settings/find/": { success: true, settings: demoSettings() },
  "/nutrition/meals/find/": { success: true, meals },
  "/nutrition/drinks/find/": { success: true, drinks: demoDrinks() },
  "/nutrition/products/find/": { success: true, products: DEMO_PRODUCTS },
  "/health/days/find/": { success: true, days: demoHealthDays() },
  "/health/pulse/find/": { success: true, samples: demoPulse() },
  "/sport/exercises/find/": { success: true, exercises: DEMO_EXERCISES },
  "/sport/routines/find/": { success: true, routines: DEMO_ROUTINES },
  "/sport/workouts/find/": { success: true, workouts: demoWorkouts() },
  "/sport/trainings/find/": { success: true, trainings: demoTrainings() },
  "/sport/measurements/find/": { success: true, entries: demoMeasurements() },
  "/sport/workout/active/find/": { success: true },
};

/** Answers the paths that compute or store something instead of just reading. */
function write(path: string, body: Body): Body {
  if (path === "/user/settings/change/") {
    reads["/user/settings/find/"] = { success: true, settings: body.settings };
  } else if (path.endsWith("/sync/") && path !== "/sport/workout/active/sync/") {
    reads[path.replace(/sync\/$/, "find/")] = { success: true, ...body };
  } else if (path === "/sport/workout/active/sync/") {
    reads["/sport/workout/active/find/"] = { success: true, workout: body.workout, updated: Date.now() };
    return { success: true, updated: Date.now() };
  } else if (path === "/sport/workout/active/clear/") {
    reads["/sport/workout/active/find/"] = { success: true };
  } else if (path === "/glucose/predict/") {
    return demoPrediction(glucose, Number(body.horizon) || 30);
  } else if (path === "/signin/" || path === "/refresh/") {
    return TOKENS;
  }
  return { success: true };
}

function respond(config: InternalAxiosRequestConfig): Body {
  const path = `/${(config.url ?? "").replace(/^\/+/, "")}`;
  if (path === "/health/pulse/live/find/") {
    return { success: true, b: Math.round(between(64, 78)) };
  }
  if (config.method === "get" && reads[path]) {
    return structuredClone(reads[path]);
  }
  const body = typeof config.data === "string" && config.data ? JSON.parse(config.data) : {};
  return write(path, body);
}

export const demoAdapter: AxiosAdapter = async (config) => ({
  data: respond(config),
  status: 200,
  statusText: "OK",
  headers: {},
  config,
});

export const DEMO_SESSION = TOKENS;
