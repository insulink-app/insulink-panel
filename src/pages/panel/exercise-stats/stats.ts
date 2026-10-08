// Everything that turns raw workouts into the page's numbers. No React here —
// the views only render what these return.
import { formatNumber } from "@/lib/format";
import { startOfWeek } from "date-fns";
import type { Routine, SetLog, SportExercise, Workout } from "@/api/services/sport-service";

export interface Session {
  time: number;
  best: number; // best setScore in the session
  sets: number;
}

export interface ExerciseStat {
  exercise: SportExercise;
  totalSets: number;
  best: number; // best setScore across all sessions
  lastAt: number;
  sessions: Session[]; // chronological
}

export type SortKey = "last" | "name" | "sets" | "best";

export interface RoutineSeries {
  name: string;
  color: string;
  points: { time: number; value: number; delta: number }[];
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Epley estimate, the standard one-rep-max formula — lets a heavy triple and a
// light set of twelve compare on one axis for the progression chart.
function estimatedOneRepMax(set: SetLog): number {
  const kg = set.kg ?? 0;
  const reps = set.reps ?? 0;
  if (kg <= 0 || reps <= 0) {
    return 0;
  }
  return kg * (1 + reps / 30);
}

// The single number that says "how good was this set" for the exercise's kind:
// est. 1RM for weighted, reps for bodyweight, seconds held for timed.
function setScore(set: SetLog, kind: SportExercise["kind"]): number {
  if (kind === "weighted") {
    return estimatedOneRepMax(set);
  }
  if (kind === "timed") {
    return set.secs ?? 0;
  }
  return set.reps ?? 0;
}

// Roll every logged set across every workout into per-exercise stats. One pass:
// group sets by workout+exercise for the per-session best, and accumulate the
// exercise totals alongside.
export function buildStats(workouts: Workout[], exercises: SportExercise[]): ExerciseStat[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const stats = new Map<string, ExerciseStat>();

  for (const workout of workouts) {
    // Sets of the same exercise within this workout collapse to one session.
    const sessionBest = new Map<string, { best: number; count: number }>();
    for (const set of workout.sets) {
      const exercise = byId.get(set.ex);
      if (!exercise) {
        continue;
      }
      const score = setScore(set, exercise.kind);
      const running = sessionBest.get(set.ex) ?? { best: 0, count: 0 };
      sessionBest.set(set.ex, {
        best: Math.max(running.best, score),
        count: running.count + 1,
      });
    }

    for (const [exerciseId, session] of sessionBest) {
      const exercise = byId.get(exerciseId)!;
      const stat =
        stats.get(exerciseId) ??
        ({
          exercise,
          totalSets: 0,
          best: 0,
          lastAt: 0,
          sessions: [],
        } satisfies ExerciseStat);
      stat.totalSets += session.count;
      stat.best = Math.max(stat.best, session.best);
      stat.lastAt = Math.max(stat.lastAt, workout.started);
      stat.sessions.push({ time: workout.started, best: session.best, sets: session.count });
      stats.set(exerciseId, stat);
    }
  }

  for (const stat of stats.values()) {
    stat.sessions.sort((left, right) => left.time - right.time);
  }
  return [...stats.values()].sort((left, right) => right.lastAt - left.lastAt);
}

export function sortStats(stats: ExerciseStat[], key: SortKey): ExerciseStat[] {
  const sorted = [...stats];
  switch (key) {
    case "name":
      return sorted.sort((left, right) => left.exercise.name.localeCompare(right.exercise.name));
    case "sets":
      return sorted.sort((left, right) => right.totalSets - left.totalSets);
    case "best":
      return sorted.sort((left, right) => right.best - left.best);
    default:
      return sorted.sort((left, right) => right.lastAt - left.lastAt);
  }
}

// A single "how much did I do this run" number, so two runs of the same routine
// compare on one axis: total reps, plus lifted volume (kg × reps) when weight is
// used and seconds for timed holds. For a reps-only routine it is just the reps.
// ponytail: a flat sum mixes units; fine as a relative progress proxy, revisit
// if a routine ever blends heavy lifting and long holds and the scale skews.
function workoutScore(workout: Workout): number {
  return workout.sets.reduce((sum, set) => {
    const reps = set.reps ?? 0;
    return sum + reps + (set.kg ?? 0) * reps + (set.secs ?? 0);
  }, 0);
}

// One line per routine that has been run at least twice, each point a run scored
// by [workoutScore] with its change from the previous run — so the line shows
// whether each session beat the last.
export function routineComparison(
  workouts: Workout[],
  routines: Routine[],
  untitled: string,
): RoutineSeries[] {
  const nameById = new Map(routines.map((routine) => [routine.id, routine.name]));
  const runsByRoutine = new Map<string, Workout[]>();
  for (const workout of workouts) {
    const runs = runsByRoutine.get(workout.routine) ?? [];
    runs.push(workout);
    runsByRoutine.set(workout.routine, runs);
  }

  const series: RoutineSeries[] = [];
  let colorIndex = 0;
  for (const [routineId, runs] of runsByRoutine) {
    if (runs.length < 2) {
      continue;
    }
    const ordered = runs.slice().sort((left, right) => left.started - right.started);
    const points = ordered.map((workout, index) => {
      const value = workoutScore(workout);
      const previous = index > 0 ? workoutScore(ordered[index - 1]) : value;
      return { time: workout.started, value, delta: value - previous };
    });
    series.push({
      name: nameById.get(routineId) || untitled,
      color: CHART_COLORS[colorIndex % CHART_COLORS.length],
      points,
    });
    colorIndex += 1;
  }
  return series;
}

// Sums `valueOf` into the last 12 weekly buckets (empty weeks included, so a
// training gap actually shows as a gap). Weeks start Monday.
export function weeklyBuckets(
  workouts: Workout[],
  valueOf: (workout: Workout) => number,
): { time: number; value: number }[] {
  const weekCount = 12;
  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const buckets: { time: number; value: number }[] = [];
  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - offset * 7);
    buckets.push({ time: start.getTime(), value: 0 });
  }
  const indexByWeek = new Map(buckets.map((bucket, index) => [bucket.time, index]));
  for (const workout of workouts) {
    const weekStart = startOfWeek(new Date(workout.started), { weekStartsOn: 1 }).getTime();
    const index = indexByWeek.get(weekStart);
    if (index !== undefined) {
      buckets[index].value += valueOf(workout);
    }
  }
  return buckets;
}

// The kind's best-set score, in its own unit.
export function formatScore(
  score: number,
  kind: SportExercise["kind"],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (score <= 0) {
    return "–";
  }
  if (kind === "weighted") {
    return `${formatNumber(score, 1)} ${t("body.kg")}`;
  }
  if (kind === "timed") {
    return t("exercise_stats.seconds", { n: Math.round(score) });
  }
  return t("exercise_stats.reps", { n: Math.round(score) });
}
