import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { downloadBlob, downloadCsv, downloadJson, toCsv } from "@/lib/export";
import { clarityCsv } from "@/lib/clarity";
import { zip } from "@/lib/zip";
import { Input } from "@/components/ui/input";
import {
  DATASET_IDS,
  TIMELESS_IDS,
  fetchDataset,
  type DatasetId,
} from "@/lib/export-datasets";
import { isRangeValid, type ExportRange } from "@/lib/export-range";
import type { GlucoseEntry } from "@/api/services/glucose-service";
import type { Meal } from "@/api/services/nutrition-service";

// Stable, language-independent ids — the labels come from `t()`.
const FORMAT_IDS = ["clarity", "csv", "json"] as const;
type FormatId = (typeof FORMAT_IDS)[number];

const stamp = () => format(new Date(), "yyyy-MM-dd");

// Picking only collections that turn out to be empty is a normal outcome, not a
// failure — it needs its own message rather than "export failed".
class NothingToExport extends Error {}

export default function ExportPage() {
  const { t } = useTranslation();
  const [formatId, setFormatId] = useState<FormatId>("clarity");
  const [selected, setSelected] = useState<DatasetId[]>(["glucose"]);
  const [range, setRange] = useState<ExportRange>({});
  const [busy, setBusy] = useState(false);

  const toggle = (id: DatasetId) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  };

  const runExport = async () => {
    setBusy(true);
    try {
      if (formatId === "clarity") {
        await exportClarity(range);
      } else if (formatId === "json") {
        await exportJson(selected, range);
      } else {
        await exportCsv(selected, range);
      }
      toast.success(t("export.done"));
    } catch (error) {
      if (error instanceof NothingToExport) {
        toast.info(t("export.empty"));
      } else {
        toast.error(t("export.failed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const nothingPicked = formatId !== "clarity" && selected.length === 0;
  const rangeValid = isRangeValid(range);

  // Catalogues carry no timestamp, so a range leaves them whole. Only worth
  // saying when one is actually picked and a range is actually set.
  const timelessPicked =
    formatId !== "clarity" &&
    (range.from || range.to) &&
    selected.some((id) => TIMELESS_IDS.includes(id));

  return (
    <PanelPage title={t("export.title")}>
      <div className="py-6 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("export.format")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formatId}
              onValueChange={(value) => setFormatId(value as FormatId)}
              className="gap-4"
            >
              {FORMAT_IDS.map((id) => (
                <div key={id} className="flex items-start gap-3">
                  <RadioGroupItem value={id} id={`format-${id}`} className="mt-1" />
                  <div className="grid gap-1">
                    <Label htmlFor={`format-${id}`} className="font-medium">
                      {t("export.format_" + id)}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("export.format_" + id + "_hint")}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("export.range")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="grid gap-2">
                <Label htmlFor="range-from">{t("export.range_from")}</Label>
                <Input
                  id="range-from"
                  type="date"
                  className="w-auto"
                  value={range.from ?? ""}
                  max={range.to}
                  onChange={(event) =>
                    setRange((current) => ({
                      ...current,
                      from: event.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="range-to">{t("export.range_to")}</Label>
                <Input
                  id="range-to"
                  type="date"
                  className="w-auto"
                  value={range.to ?? ""}
                  min={range.from}
                  onChange={(event) =>
                    setRange((current) => ({
                      ...current,
                      to: event.target.value || undefined,
                    }))
                  }
                />
              </div>
              <Button variant="outline" onClick={() => setRange({})}>
                {t("export.range_reset")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("export.range_hint")}
            </p>
            {rangeValid ? null : (
              <p className="text-sm text-destructive">{t("export.range_invalid")}</p>
            )}
            {timelessPicked ? (
              <p className="text-sm text-muted-foreground">
                {t("export.range_timeless")}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("export.data")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {formatId === "clarity" ? (
              <p className="text-sm text-muted-foreground">
                {t("export.clarity_fixed")}
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {DATASET_IDS.map((id) => (
                    <div key={id} className="flex items-center gap-3">
                      <Checkbox
                        id={`data-${id}`}
                        checked={selected.includes(id)}
                        onCheckedChange={() => toggle(id)}
                      />
                      <Label htmlFor={`data-${id}`}>{t("export.data_" + id)}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(DATASET_IDS)}
                  >
                    {t("export.select_all")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelected([])}>
                    {t("export.select_none")}
                  </Button>
                </div>
                {formatId === "csv" && selected.length > 1 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("export.csv_zip")}
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <div>
          <Button onClick={runExport} disabled={busy || nothingPicked || !rangeValid}>
            <Download className="size-4" />
            {busy ? t("export.working") : t("export.download")}
          </Button>
        </div>
      </div>
    </PanelPage>
  );
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
