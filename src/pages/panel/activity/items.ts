// The activity page's model: workouts and cardio trainings merged into one
// time-sorted list, and the day grid its heatmap draws.
import { addDays, startOfDay, startOfWeek } from "date-fns";
import type { CardioType, Training, Workout } from "@/api/services/sport-service";
import { workoutDurationMs } from "@/lib/workout";

export type ActivityItem =
  | { kind: "workout"; at: number; data: Workout }
  | { kind: "training"; at: number; data: Training };

/** What the history can be narrowed to: strength training or one cardio type. */
export type ActivityFilter = "all" | "workout" | CardioType;

export function mergeActivities(workouts: Workout[], trainings: Training[]): ActivityItem[] {
  return [
    ...workouts.map((workout): ActivityItem => ({ kind: "workout", at: workout.started, data: workout })),
    ...trainings.map((training): ActivityItem => ({ kind: "training", at: training.start, data: training })),
  ].sort((left, right) => right.at - left.at);
}

export function itemDurationMs(item: ActivityItem) {
  return item.kind === "workout" ? workoutDurationMs(item.data) : Math.max(0, item.data.end - item.data.start);
}

export function matchesFilter(item: ActivityItem, filter: ActivityFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "workout") {
    return item.kind === "workout";
  }
  return item.kind === "training" && item.data.type === filter;
}

export interface HeatDay {
  day: number; // local midnight, epoch ms
  count: number;
  future: boolean;
}

/** Five Monday-first weeks ending with the current one, each day's count. */
export function heatmapDays(items: ActivityItem[], now = new Date()): HeatDay[] {
  const counts = new Map<number, number>();
  for (const item of items) {
    const day = startOfDay(new Date(item.at)).getTime();
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const today = startOfDay(now).getTime();
  const first = addDays(startOfWeek(now, { weekStartsOn: 1 }), -28);
  return Array.from({ length: 35 }, (_, index) => {
    const day = startOfDay(addDays(first, index)).getTime();
    return { day, count: counts.get(day) ?? 0, future: day > today };
  });
}
