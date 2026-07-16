// Every collection the panel can hand out, keyed by a stable id. The id is what
// state and filenames key off; the display label is resolved with
// `t("export.data_" + id)` so switching language never changes the selection.
import { parseISO } from "date-fns";
import { rangeBounds, type ExportRange } from "@/lib/export-range";
import glucoseService from "@/api/services/glucose-service";
import nutritionService from "@/api/services/nutrition-service";
import sportService from "@/api/services/sport-service";
import healthService from "@/api/services/health-service";
import sensorService from "@/api/services/sensor-service";
import eventService from "@/api/services/event-service";

interface Dataset {
  fetch: () => Promise<object[]>;
  timeOf?: (row: object) => number;
}

// Ties each fetch to its own row type so the accessor is checked at definition,
// then erases it — the registry itself only ever deals in plain objects.
function dataset<T extends object>(
  fetch: () => Promise<T[]>,
  timeOf?: (row: T) => number,
): Dataset {
  return { fetch, timeOf: timeOf as Dataset["timeOf"] };
}

// The time field differs per collection, and three of them are catalogues with
// no time at all — a product list is not a diary, so a range must never filter
// it down to nothing.
export const EXPORT_DATASETS = {
  glucose: dataset(
    () => glucoseService.history().then((res) => res.entries ?? []),
    (row) => row.time,
  ),
  meals: dataset(
    () => nutritionService.meals().then((res) => res.meals ?? []),
    (row) => row.time,
  ),
  drinks: dataset(
    () => nutritionService.drinks().then((res) => res.drinks ?? []),
    (row) => row.at,
  ),
  products: dataset(() =>
    nutritionService.products().then((res) => res.products ?? []),
  ),
  workouts: dataset(
    () => sportService.workouts().then((res) => res.workouts ?? []),
    (row) => row.started,
  ),
  trainings: dataset(
    () => sportService.trainings().then((res) => res.trainings ?? []),
    (row) => row.start,
  ),
  routines: dataset(() =>
    sportService.routines().then((res) => res.routines ?? []),
  ),
  exercises: dataset(() =>
    sportService.exercises().then((res) => res.exercises ?? []),
  ),
  measurements: dataset(
    () => sportService.measurements().then((res) => res.entries ?? []),
    (row) => row.time,
  ),
  health_days: dataset(
    () => healthService.days().then((res) => res.days ?? []),
    // `d` is a bare date key, not epoch ms. parseISO reads it as local midnight;
    // Date.parse would read it as UTC and drop the edge day west of Greenwich.
    (row) => parseISO(row.d).getTime(),
  ),
  pulse: dataset(
    () => healthService.pulse().then((res) => res.samples ?? []),
    (row) => row.t,
  ),
  sensors: dataset(
    () => sensorService.history().then((res) => res.sensors ?? []),
    (row) => row.registered_at,
  ),
  events: dataset(
    () => eventService.history().then((res) => res.entries ?? []),
    (row) => row.time,
  ),
} satisfies Record<string, Dataset>;

export type DatasetId = keyof typeof EXPORT_DATASETS;

export const DATASET_IDS = Object.keys(EXPORT_DATASETS) as DatasetId[];

// Datasets a range cannot narrow. Surfaced so the UI can say so rather than
// leaving the user wondering why the range did nothing.
export const TIMELESS_IDS = DATASET_IDS.filter(
  (id) => EXPORT_DATASETS[id].timeOf === undefined,
);

export async function fetchDataset(
  id: DatasetId,
  range: ExportRange = {},
): Promise<object[]> {
  const { fetch, timeOf } = EXPORT_DATASETS[id];
  const rows = await fetch();
  if (!timeOf) {
    return rows;
  }
  const bounds = rangeBounds(range);
  return rows.filter((row) => {
    const time = timeOf(row);
    return time >= bounds.from && time <= bounds.to;
  });
}
