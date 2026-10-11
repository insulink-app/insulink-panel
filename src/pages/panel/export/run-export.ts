// The three export formats, each fetching its datasets and starting the download.
import { format } from "date-fns";
import { downloadBlob, downloadCsv, downloadJson, toCsv } from "@/lib/export";
import { clarityCsv } from "@/lib/clarity";
import { zip } from "@/lib/zip";
import { fetchDataset, type DatasetId } from "@/lib/export-datasets";
import type { ExportRange } from "@/lib/export-range";
import type { GlucoseEntry } from "@/api/services/glucose-service";
import type { Meal } from "@/api/services/nutrition-service";

export const FORMAT_IDS = ["clarity", "csv", "json"] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

/** Clarity's fixed layout: glucose, and carbs and bolus from the meals. */
export const CLARITY_IDS: DatasetId[] = ["glucose", "meals"];

const stamp = () => format(new Date(), "yyyy-MM-dd");

// Picking only collections that turn out to be empty is a normal outcome, not a
// failure: it needs its own message rather than "export failed".
export class NothingToExport extends Error {}

export async function runExport(formatId: FormatId, ids: DatasetId[], range: ExportRange) {
  if (formatId === "clarity") {
    await exportClarity(range);
  } else if (formatId === "json") {
    await exportJson(ids, range);
  } else {
    await exportCsv(ids, range);
  }
}

// A range narrows the filename too, so two exports of the same data never
// collide in the download folder.
function suffix(range: ExportRange) {
  if (!range.from && !range.to) {
    return stamp();
  }
  return `${range.from ?? "start"}_${range.to ?? stamp()}`;
}

async function collect(ids: DatasetId[], range: ExportRange) {
  const collections = await Promise.all(
    ids.map((id) => fetchDataset(id, range)),
  );
  return ids.map((id, position) => ({
    id,
    rows: collections[position] as Record<string, unknown>[],
  }));
}

async function exportClarity(range: ExportRange) {
  const [entries, meals] = await Promise.all([
    fetchDataset("glucose", range) as Promise<GlucoseEntry[]>,
    fetchDataset("meals", range) as Promise<Meal[]>,
  ]);
  // A header-only file is not an export the user can do anything with.
  if (entries.length === 0 && meals.length === 0) {
    throw new NothingToExport();
  }
  downloadCsv(`insulink-clarity-${suffix(range)}.csv`, clarityCsv(entries, meals));
}

async function exportJson(ids: DatasetId[], range: ExportRange) {
  const collected = await collect(ids, range);
  if (collected.every((entry) => entry.rows.length === 0)) {
    throw new NothingToExport();
  }
  downloadJson(`insulink-${suffix(range)}.json`, {
    exported_at: Date.now(),
    range,
    ...Object.fromEntries(collected.map((entry) => [entry.id, entry.rows])),
  });
}

// One file per collection — a CSV holds a single table, so a combined dump would
// have to invent a shape no importer reads. A single pick downloads bare; several
// get bundled, so the browser sees one download instead of N.
async function exportCsv(ids: DatasetId[], range: ExportRange) {
  // An empty collection would become a header-less, contentless file.
  const files = (await collect(ids, range)).filter(
    (entry) => entry.rows.length > 0,
  );

  if (files.length === 0) {
    throw new NothingToExport();
  }
  if (files.length === 1) {
    downloadCsv(`insulink-${files[0].id}-${suffix(range)}.csv`, toCsv(files[0].rows));
    return;
  }
  downloadBlob(
    `insulink-${suffix(range)}.zip`,
    await zip(
      files.map((entry) => ({
        name: `insulink-${entry.id}-${suffix(range)}.csv`,
        text: toCsv(entry.rows),
      })),
    ),
  );
}

/** About how many bytes the download will be, from the rows it will hold. */
export function exportBytes(formatId: FormatId, rows: Partial<Record<DatasetId, object[]>>): number {
  if (formatId === "clarity") {
    return clarityCsv((rows.glucose ?? []) as GlucoseEntry[], (rows.meals ?? []) as Meal[]).length;
  }
  if (formatId === "json") {
    return JSON.stringify(rows).length;
  }
  return Object.values(rows).reduce((sum, list) => sum + (list?.length ? toCsv(list as Record<string, unknown>[]).length : 0), 0);
}
