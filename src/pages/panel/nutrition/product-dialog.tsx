import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckIcon, Search } from "@/components/icons";
import nutritionService, { type FoodProduct } from "@/api/services/nutrition-service";
import { Segmented } from "@/components/segmented";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatAmount } from "@/lib/nutrition";
import { parseNumber } from "@/lib/format";
import { useSyncProducts } from "./use-sync-products";

/** The form while typing: numbers stay strings until saved. */
type Draft = Record<"barcode" | "name" | "brand" | "unit" | "serving" | "serving_label" | "carbs" | "fat" | "protein" | "kcal", string>;

const EMPTY: Draft = { barcode: "", name: "", brand: "", unit: "g", serving: "", serving_label: "", carbs: "", fat: "", protein: "", kcal: "" };

const shown = (value?: number) => (value == null ? "" : formatAmount(value));

const draftOf = (product: FoodProduct): Draft => ({
  barcode: product.barcode ?? "",
  name: product.name ?? "",
  brand: product.brand ?? "",
  unit: product.unit === "ml" ? "ml" : "g",
  serving: shown(product.serving),
  serving_label: product.serving_label ?? "",
  carbs: shown(product.carbs),
  fat: shown(product.fat),
  protein: shown(product.protein),
  kcal: shown(product.kcal),
});

const productOf = (draft: Draft): FoodProduct => ({
  // A product without a scanned barcode gets a synthetic one: the set is keyed by it.
  barcode: draft.barcode.trim() || crypto.randomUUID(),
  name: draft.name.trim(),
  brand: draft.brand.trim(),
  unit: draft.unit,
  serving: parseNumber(draft.serving) ?? undefined,
  serving_label: draft.serving_label.trim(),
  carbs: parseNumber(draft.carbs) ?? 0,
  fat: parseNumber(draft.fat) ?? 0,
  protein: parseNumber(draft.protein) ?? 0,
  kcal: parseNumber(draft.kcal) ?? 0,
});

/**
 * "Neues Produkt": an empty form, with an optional Open Food Facts search on
 * the left whose result only pre-fills it. With `product` the same dialog
 * edits that product in place, without the search.
 */
export function ProductDialog({
  existing,
  product,
  open,
  onOpenChange,
}: {
  existing: FoodProduct[];
  product?: FoodProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const editing = product !== undefined;
  const [draft, setDraft] = useState<Draft>(() => (product ? draftOf(product) : EMPTY));
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const close = () => {
    onOpenChange(false);
    setDraft(product ? draftOf(product) : EMPTY);
  };
  const save = useSyncProducts(() => {
    toast.success(t(editing ? "nutrition.add.updated" : "nutrition.add.saved"));
    close();
  });
  const submit = () => {
    if (!draft.name.trim()) {
      toast.error(t("nutrition.add.name_required"));
      return;
    }
    const next = productOf(draft);
    save.mutate(editing ? existing.map((entry) => (entry === product ? next : entry)) : [...existing, next]);
  };
  const base = draft.unit;
  const per100 = (unit: string) => t("nutrition.add.per_100", { unit, base });

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[92svh] gap-6 overflow-y-auto p-7 sm:max-w-[880px]">
        <DialogHeader>
          <DialogTitle>{t(editing ? "nutrition.add.edit_title" : "nutrition.add.title")}</DialogTitle>
          <DialogDescription>{t(editing ? "nutrition.add.edit_subtitle" : "nutrition.add.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className={editing ? "" : "grid gap-6 md:grid-cols-[232px_minmax(0,1fr)]"}>
          {!editing && <ProductSearch onPick={(result) => setDraft(draftOf(result))} />}
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <FormField label={t("nutrition.add.name")} className="col-span-2">
              <TextInput value={draft.name} onChange={(value) => set("name", value)} placeholder={t("nutrition.add.name_placeholder")} />
            </FormField>
            <FormField label={t("nutrition.add.brand")}>
              <TextInput value={draft.brand} onChange={(value) => set("brand", value)} placeholder={t("nutrition.add.brand_placeholder")} />
            </FormField>
            <FormField label={t("nutrition.add.unit")}>
              <Segmented
                label={t("nutrition.add.unit")}
                value={draft.unit}
                onChange={(unit) => set("unit", unit)}
                className="flex h-12 w-full items-center px-1.5"
                options={[
                  { value: "g", label: "g" },
                  { value: "ml", label: "ml" },
                ]}
              />
            </FormField>
            <FormField label={t("nutrition.add.carbs")}>
              <TextInput numeric value={draft.carbs} onChange={(value) => set("carbs", value)} unit={per100("g")} />
            </FormField>
            <FormField label={t("nutrition.add.kcal")}>
              <TextInput numeric value={draft.kcal} onChange={(value) => set("kcal", value)} unit={per100("kcal")} />
            </FormField>
            <FormField label={t("nutrition.add.fat")}>
              <TextInput numeric value={draft.fat} onChange={(value) => set("fat", value)} unit={per100("g")} />
            </FormField>
            <FormField label={t("nutrition.add.protein")}>
              <TextInput numeric value={draft.protein} onChange={(value) => set("protein", value)} unit={per100("g")} />
            </FormField>
            <FormField label={t("nutrition.add.serving")} className="col-span-2">
              <TextInput numeric value={draft.serving} onChange={(value) => set("serving", value)} unit={base} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={close} className="h-11 rounded-full border border-divider px-5 text-sm font-bold hover:bg-raised">
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={save.isPending}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? <Spinner className="size-4" /> : <CheckIcon className="size-4" aria-hidden />}
            {t("nutrition.add.save")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The optional Open Food Facts search; a picked result pre-fills the form. */
function ProductSearch({ onPick }: { onPick: (product: FoodProduct) => void }) {
  const { t } = useTranslation();
  const [terms, setTerms] = useState("");
  const search = useMutation({
    mutationFn: (query: string) => nutritionService.searchProducts(query),
    onError: () => toast.error(t("nutrition.add.search_failed")),
  });
  const results = search.data;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (terms.trim()) {
            search.mutate(terms.trim());
          }
        }}
        className="flex h-12 items-center gap-2 rounded-2xl bg-ground px-4"
      >
        {search.isPending ? <Spinner className="size-4" /> : <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        <input
          value={terms}
          onChange={(event) => setTerms(event.target.value)}
          placeholder={t("nutrition.add.search_placeholder")}
          aria-label={t("nutrition.add.search_placeholder")}
          className="border-0 p-0 shadow-none focus:ring-0 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-placeholder"
        />
      </form>
      {results === undefined ? (
        <div className="grid min-h-[260px] flex-1 place-items-center rounded-[20px] border border-dashed border-divider p-6 text-center">
          <span className="text-sm text-muted-foreground">
            <Search className="mx-auto mb-3 size-5" aria-hidden />
            {t("nutrition.add.search_hint")}
          </span>
        </div>
      ) : results.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("nutrition.add.no_results")}</p>
      ) : (
        <ul className="scroll-thin max-h-[320px] divide-y divide-divider overflow-y-auto rounded-[20px] bg-ground">
          {results.map((result, index) => (
            <li key={result.barcode || index}>
              <button type="button" onClick={() => onPick(result)} className="w-full px-4 py-3 text-left hover:bg-raised">
                <b className="block truncate text-sm">{result.name}</b>
                <span className="block truncate text-xs text-muted-foreground">
                  {[result.brand, `${formatAmount(result.carbs ?? 0)} ${t("nutrition.add.carbs_short")}`].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-[13px] font-bold">{label}</span>
      {children}
    </label>
  );
}

/** A form field on the ground colour, with its unit inside at the right. */
function TextInput({
  value,
  onChange,
  placeholder,
  unit,
  numeric,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  unit?: string;
  numeric?: boolean;
}) {
  return (
    <span className="flex h-12 items-center gap-2 rounded-2xl border-[1.5px] border-transparent bg-ground px-4 focus-within:border-brand">
      <input
        value={value}
        inputMode={numeric ? "decimal" : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? (numeric ? "0" : undefined)}
        className="border-0 p-0 shadow-none focus:ring-0 min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-placeholder"
      />
      {unit && <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{unit}</span>}
    </span>
  );
}
