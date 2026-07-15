// Dexcom Clarity CSV layout — the de-facto interchange format for CGM data, and
// what Glooko/Tidepool/xDrip accept as an upload.
//
// IMPORTANT: this is rebuilt from the shape of a Clarity export, not from a
// published spec. Glooko has no documented open CSV import, so the column set
// below is a best reconstruction: verify one real upload before trusting it, and
// fix the headers here if the importer rejects them.
import { format } from "date-fns";
import type { GlucoseEntry } from "@/api/services/glucose-service";
import type { Meal } from "@/api/services/nutrition-service";

const HEADERS = [
  "Index",
  "Timestamp (YYYY-MM-DDThh:mm:ss)",
  "Event Type",
  "Event Subtype",
  "Patient Info",
  "Device Info",
  "Source Device ID",
  "Glucose Value (mg/dL)",
  "Insulin Value (u)",
  "Carb Value (grams)",
  "Duration (hh:mm:ss)",
  "Glucose Rate of Change (mg/dL/min)",
  "Transmitter Time (Long Integer)",
  "Transmitter ID",
];

const SOURCE_DEVICE_ID = "Insulink";

// Clarity's own export writes the sensor's out-of-range readings as words, not
// numbers, and importers key off exactly that. A raw 38 would read as a real
// measurement it never was.
const SENSOR_MIN = 40;
const SENSOR_MAX = 400;

type ClarityEvent = {
  time: number;
  type: "EGV" | "Insulin" | "Carbs";
  subtype?: string;
  glucose?: number;
  insulin?: number;
  carbs?: number;
};

export function clarityGlucose(mgdl: number): string {
  if (mgdl < SENSOR_MIN) {
    return "Low";
  }
  if (mgdl > SENSOR_MAX) {
    return "High";
  }
  return String(Math.round(mgdl));
}

// A meal contributes a carb row and a bolus row independently — a correction
// bolus carries no carbs, a logged snack no insulin.
function mealEvents(meal: Meal): ClarityEvent[] {
  const events: ClarityEvent[] = [];
  if (meal.carbs) {
    events.push({ time: meal.time, type: "Carbs", carbs: meal.carbs });
  }
  if (meal.bolus) {
    events.push({
      time: meal.time,
      type: "Insulin",
      subtype: "Fast-Acting",
      insulin: meal.bolus,
    });
  }
  return events;
}

// Local wall-clock with no zone suffix, matching Clarity: the importer reads the
// timestamps as the patient's own time.
function clarityTimestamp(time: number): string {
  return format(new Date(time), "yyyy-MM-dd'T'HH:mm:ss");
}

function eventRow(event: ClarityEvent, index: number): string {
  const cells = new Array(HEADERS.length).fill("");
  cells[0] = String(index);
  cells[1] = clarityTimestamp(event.time);
  cells[2] = event.type;
  cells[3] = event.subtype ?? "";
  cells[6] = SOURCE_DEVICE_ID;
  cells[7] = event.glucose == null ? "" : clarityGlucose(event.glucose);
  cells[8] = event.insulin == null ? "" : String(event.insulin);
  cells[9] = event.carbs == null ? "" : String(Math.round(event.carbs));
  return cells.join(",");
}

// ponytail: the patient/device preamble rows a real Clarity file opens with are
// left out — they carry no readings and we would be inventing their layout.
// Add them if an importer turns out to demand them.
export function clarityCsv(entries: GlucoseEntry[], meals: Meal[]): string {
  const events = [
    ...entries.map(
      (entry): ClarityEvent => ({
        time: entry.time,
        type: "EGV",
        glucose: entry.value,
      }),
    ),
    ...meals.flatMap(mealEvents),
  ].sort((first, second) => first.time - second.time);

  const rows = events.map((event, position) => eventRow(event, position + 1));
  return [HEADERS.join(","), ...rows].join("\n");
}
