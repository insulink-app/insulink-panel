import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO, subDays } from "date-fns";
import { toast } from "sonner";
import { Code, Download, FileText, Table } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { Spinner } from "@/components/ui/spinner";
import { DATASET_IDS, TIMELESS_IDS, fetchDataset, type DatasetId } from "@/lib/export-datasets";
import { isRangeValid, type ExportRange } from "@/lib/export-range";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CLARITY_IDS, FORMAT_IDS, NothingToExport, exportBytes, runExport, type FormatId } from "./run-export";

const FORMAT_ICONS = { clarity: FileText, csv: Table, json: Code } as const;
const QUICK_DAYS = [7, 30, 90, 0] as const;

/**
 * Export: the format as three cards, the period with quick picks, the areas as
 * checkboxes (those the format cannot hold disabled), and a summary of what the
 * download will hold beside the download button.
 */
export default function ExportPage() {
  const { t } = useTranslation();
  const [formatId, setFormatId] = useState<FormatId>("clarity");
  const [selected, setSelected] = useState<DatasetId[]>(["glucose"]);
  const [range, setRange] = useState<ExportRange>({});
  const [busy, setBusy] = useState(false);
  const ids = formatId === "clarity" ? CLARITY_IDS : selected;
  const allSelected = selected.length === DATASET_IDS.length;
  const rangeValid = isRangeValid(range);
  const rows = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["export-preview", id, range.from, range.to],
      queryFn: () => fetchDataset(id, range),
      enabled: rangeValid,
    })),
  });
  const loaded = rows.every((query) => query.data !== undefined);
  const byId = Object.fromEntries(ids.map((id, index) => [id, rows[index]?.data ?? []])) as Partial<Record<DatasetId, object[]>>;
  const entries = Object.values(byId).reduce((sum, list) => sum + (list?.length ?? 0), 0);
  const quick = QUICK_DAYS.find((days) =>
    days === 0 ? !range.from && !range.to : !range.to && range.from === format(subDays(new Date(), days - 1), "yyyy-MM-dd"),
  );

  const download = async () => {
    setBusy(true);
    try {
      await runExport(formatId, ids, range);
      toast.success(t("export.done"));
    } catch (error) {
      toast[error instanceof NothingToExport ? "info" : "error"](t(error instanceof NothingToExport ? "export.empty" : "export.failed"));
    } finally {
      setBusy(false);
    }
  };

  const day = (value?: string) => (value ? format(parseISO(value), "dd.MM.yyyy") : undefined);
  const period = `${day(range.from) ?? t("export.start")} – ${day(range.to) ?? t("export.today")}`;

  return (
    <PanelPage title={t("export.title")}>
      <PageHeader title={t("export.title")} />
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Card className="gap-0 p-6">
          <CardHeading title={t("export.format")} />
          <div role="radiogroup" aria-label={t("export.format")} className="mt-4 grid gap-4 md:grid-cols-3">
            {FORMAT_IDS.map((id) => {
              const Icon = FORMAT_ICONS[id];
              const checked = id === formatId;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setFormatId(id)}
                  className={cn(
                    "rounded-[20px] border-[1.5px] p-5 text-left transition-colors",
                    checked ? "border-brand bg-raised" : "border-transparent bg-ground hover:border-divider",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-full bg-brand/12 text-brand">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className={cn("grid size-6 place-items-center rounded-full border-2", checked ? "border-brand" : "border-divider")}>
                      {checked && <i className="block size-2.5 rounded-full bg-brand" />}
                    </span>
                  </span>
                  <b className="mt-4 block text-[15px]">{t("export.format_" + id)}</b>
                  <span className="mt-1.5 block text-[13px] text-muted-foreground">{t("export.format_" + id + "_short")}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-7 border-t border-divider pt-6">
            <CardHeading title={t("export.range")} />
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <DateField label={t("export.range_from")} value={range.from} max={range.to} onChange={(from) => setRange((current) => ({ ...current, from }))} />
              <DateField label={t("export.range_to")} value={range.to} min={range.from} onChange={(to) => setRange((current) => ({ ...current, to }))} />
              <Segmented
                label={t("export.range")}
                value={quick ?? -1}
                onChange={(days) => setRange(days === 0 ? {} : { from: format(subDays(new Date(), days - 1), "yyyy-MM-dd") })}
                className="mb-1"
                options={QUICK_DAYS.map((days) => ({ value: days, label: days === 0 ? t("export.range_all") : t("common.range_days", { n: days }) }))}
              />
            </div>
            {!rangeValid && <p className="mt-3 text-sm text-destructive">{t("export.range_invalid")}</p>}
            {formatId !== "clarity" && (range.from || range.to) && selected.some((id) => TIMELESS_IDS.includes(id)) && (
              <p className="mt-3 text-sm text-muted-foreground">{t("export.range_timeless")}</p>
            )}
          </div>

          <div className="mt-7 border-t border-divider pt-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-extrabold">{t("export.data")}</h2>
              {formatId === "clarity" && <span className="text-[13px] text-muted-foreground">{t("export.clarity_reason")}</span>}
              {formatId !== "clarity" && (
                <button
                  type="button"
                  onClick={() => setSelected(allSelected ? [] : DATASET_IDS)}
                  className="ml-auto text-sm font-bold text-brand hover:underline"
                >
                  {t(allSelected ? "export.select_none" : "export.select_all")}
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DATASET_IDS.map((id) => {
                const fixed = formatId === "clarity";
                const checked = fixed ? CLARITY_IDS.includes(id) : selected.includes(id);
                const disabled = fixed;
                return (
                  <label
                    key={id}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-2xl bg-ground px-4 text-sm font-bold",
                      disabled && !checked && "opacity-45",
                      !disabled && "cursor-pointer hover:bg-raised",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() =>
                        setSelected((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]))
                      }
                    />
                    {t("export.data_" + id)}
                  </label>
                );
              })}
            </div>
            {formatId === "csv" && selected.length > 1 && <p className="mt-3 text-sm text-muted-foreground">{t("export.csv_zip")}</p>}
          </div>
        </Card>

        <Card className="gap-0 p-6">
          <CardHeading title={t("export.summary")} />
          <div className="mt-4 divide-y divide-divider border-t border-divider">
            <SummaryRow label={t("export.format")} value={t("export.format_" + formatId)} />
            <SummaryRow label={t("export.range")} value={period} />
            <SummaryRow label={t("export.areas")} value={ids.length ? ids.map((id) => t("export.data_" + id)).join(", ") : t("export.none_selected")} />
            <SummaryRow label={t("export.entries")} value={loaded ? t("export.approx", { value: formatNumber(entries) }) : <Spinner className="size-4" />} />
            <SummaryRow label={t("export.size")} value={loaded ? t("export.approx", { value: fileSize(exportBytes(formatId, byId)) }) : <Spinner className="size-4" />} />
          </div>
          <button
            type="button"
            onClick={download}
            disabled={busy || ids.length === 0 || !rangeValid}
            className="mt-auto inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-extrabold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {busy ? <Spinner className="size-4" /> : <Download className="size-4" aria-hidden />}
            {busy ? t("export.working") : t("export.download")}
          </button>
        </Card>
      </div>
    </PanelPage>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value?: string;
  min?: string;
  max?: string;
  onChange: (value?: string) => void;
}) {
  return (
    <label className="min-w-[200px] flex-1">
      <span className="mb-1.5 block text-[13px] font-bold">{label}</span>
      <span className="flex h-12 items-center gap-3 rounded-2xl border-[1.5px] border-transparent bg-ground px-4 focus-within:border-brand">
        <input
          type="date"
          value={value ?? ""}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value || undefined)}
          className="border-0 p-0 shadow-none focus:ring-0 min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none dark:[color-scheme:dark]"
        />
      </span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <b className="text-right">{value}</b>
    </div>
  );
}

/** Bytes as KB or MB, German style. */
function fileSize(bytes: number) {
  return bytes >= 1_000_000 ? `${formatNumber(bytes / 1_000_000, 1)} MB` : `${formatNumber(Math.max(1, Math.round(bytes / 1000)))} KB`;
}
