import type { EventEntry } from "@/api/services/event-service";

// The event categories the analysis log groups its types into, mirroring the
// app's event_log_view: glucose lows, glucose highs, signal loss, and sensor
// swap/stop. `order` is the stack/legend order (severity-ish, high visibility
// first).
export type EventCategory = "low" | "high" | "signal" | "sensor" | "other";

export const EVENT_CATEGORIES: EventCategory[] = [
  "low",
  "high",
  "signal",
  "sensor",
];

interface CategoryMeta {
  // CSS custom property resolving to the category colour, for dots/legend
  // (usable directly) and to resolve to hex for chart fills.
  cssVar: string;
}

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  low: { cssVar: "--glucose-low" },
  high: { cssVar: "--glucose-high" },
  signal: { cssVar: "--muted-foreground" },
  sensor: { cssVar: "--primary" },
  other: { cssVar: "--muted-foreground" },
};

// Which category an event type belongs to. Unknown types fall back to "other"
// so a future event slug still renders.
export function categoryOf(type: string): EventCategory {
  switch (type) {
    case "glucose_low":
    case "glucose_low_urgent":
      return "low";
    case "glucose_high":
    case "glucose_high_urgent":
      return "high";
    case "signal_loss":
      return "signal";
    case "new_sensor":
    case "sensor_stopped":
      return "sensor";
    default:
      return "other";
  }
}

// The mg/dL value a glucose event carries in its `data` string, or null when
// the payload is empty (non-glucose events) or unparseable — the inverse of the
// app's event_sync `data` mapping.
export function eventValue(entry: EventEntry): number | null {
  if (!entry.data) {
    return null;
  }
  const parsed = Number(entry.data);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface CategoryCount {
  category: EventCategory;
  count: number;
}

// Event count per category, for the summary tiles.
export function countByCategory(entries: EventEntry[]): CategoryCount[] {
  return EVENT_CATEGORIES.map((category) => ({
    category,
    count: entries.filter((entry) => categoryOf(entry.type) === category).length,
  }));
}

export interface DailyEventCounts {
  day: number; // local-midnight epoch ms
  low: number;
  high: number;
  signal: number;
  sensor: number;
}

// Per-day counts split by category, ascending, only for days that have events —
// the stacked bar chart's data.
export function dailyEventCounts(entries: EventEntry[]): DailyEventCounts[] {
  const byDay = new Map<number, DailyEventCounts>();
  for (const entry of entries) {
    const date = new Date(entry.time);
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const bucket =
      byDay.get(day) ?? { day, low: 0, high: 0, signal: 0, sensor: 0 };
    const category = categoryOf(entry.type);
    if (category !== "other") {
      bucket[category]++;
    }
    byDay.set(day, bucket);
  }
  return [...byDay.values()].sort((left, right) => left.day - right.day);
}
