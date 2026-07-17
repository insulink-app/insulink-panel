import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Pencil, Search, Trash2 } from "@/components/icons";
import { toast } from "sonner";
import nutritionService, {
  type FoodProduct,
} from "@/api/services/nutrition-service";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// A blank draft the manual form edits. Numbers are kept as strings while typing
// and parsed on save.
type Draft = {
  barcode: string;
  name: string;
  brand: string;
  unit: string;
  serving: string;
  serving_label: string;
  carbs: string;
  fat: string;
  protein: string;
  kcal: string;
};

const emptyDraft: Draft = {
  barcode: "",
  name: "",
  brand: "",
  unit: "g",
  serving: "",
  serving_label: "",
  carbs: "",
  fat: "",
  protein: "",
  kcal: "",
};

const draftFromProduct = (product: FoodProduct): Draft => ({
  barcode: product.barcode ?? "",
  name: product.name ?? "",
  brand: product.brand ?? "",
  unit: product.unit ?? "g",
  serving: product.serving != null ? String(product.serving) : "",
  serving_label: product.serving_label ?? "",
  carbs: product.carbs != null ? String(product.carbs) : "",
  fat: product.fat != null ? String(product.fat) : "",
  protein: product.protein != null ? String(product.protein) : "",
  kcal: product.kcal != null ? String(product.kcal) : "",
});

const toNumber = (value: string): number => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const draftToProduct = (draft: Draft): FoodProduct => ({
  // Manual/search entries without a scanned barcode get a synthetic id, since
  // the product set is keyed by barcode (an empty one would collide/overwrite).
  barcode: draft.barcode.trim() || crypto.randomUUID(),
  name: draft.name.trim(),
  brand: draft.brand.trim(),
  unit: draft.unit === "ml" ? "ml" : "g",
  serving: draft.serving.trim() ? toNumber(draft.serving) : undefined,
  serving_label: draft.serving_label.trim(),
  carbs: toNumber(draft.carbs),
  fat: toNumber(draft.fat),
  protein: toNumber(draft.protein),
  kcal: toNumber(draft.kcal),
});

// Full-replace write: re-send the whole set with one product added or replaced,
// then refresh the list. Shared by add, edit and delete.
const useSyncProducts = (onDone?: () => void) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (products: FoodProduct[]) =>
      nutritionService.syncProducts(products),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onDone?.();
    },
    onError: () => toast.error(t("nutrition.add.save_failed")),
  });
};

/**
 * Add or edit a product. Without `product` it appends a new entry (and offers
 * Open Food Facts search to prefill); with `product` it edits that entry in
 * place. Pass `trigger` for a self-opening button, or drive `open`/`onOpenChange`
 * externally (e.g. from a dropdown menu item).
 */
export default function ProductDialog({
  existing,
  product,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  existing: FoodProduct[];
  product?: FoodProduct;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const editing = !!product;
  const initial = () => (product ? draftFromProduct(product) : emptyDraft);

  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [terms, setTerms] = useState("");
  const [results, setResults] = useState<FoodProduct[] | null>(null);

  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const search = useMutation({
    mutationFn: (query: string) => nutritionService.searchProducts(query),
    onSuccess: (products) => setResults(products),
    onError: () => toast.error(t("nutrition.add.search_failed")),
  });

  const close = () => {
    setOpen(false);
    setDraft(initial());
    setTerms("");
    setResults(null);
  };

  const save = useSyncProducts(() => {
    toast.success(t(editing ? "nutrition.add.updated" : "nutrition.add.saved"));
    close();
  });

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast.error(t("nutrition.add.name_required"));
      return;
    }
    const updated = draftToProduct(draft);
    // Reference-match the edited row so it is replaced in place; otherwise append.
    const next = editing
      ? existing.map((entry) => (entry === product ? updated : entry))
      : [...existing, updated];
    save.mutate(next);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(editing ? "nutrition.add.edit_title" : "nutrition.add.title")}
          </DialogTitle>
        </DialogHeader>

        {/* Search Open Food Facts, click a result to prefill the form below.
            Only offered when adding — editing keeps the existing product. */}
        {!editing && (
          <>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (terms.trim()) {
                  search.mutate(terms.trim());
                }
              }}
            >
              <Input
                value={terms}
                onChange={(event) => setTerms(event.target.value)}
                placeholder={t("nutrition.add.search_placeholder")}
              />
              <Button type="submit" variant="secondary" disabled={search.isPending}>
                {search.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </form>

            {results !== null && (
              <div className="max-h-48 divide-y overflow-y-auto rounded-lg border">
                {results.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {t("nutrition.add.no_results")}
                  </p>
                ) : (
                  results.map((result, index) => (
                    <button
                      key={result.barcode || index}
                      type="button"
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/60"
                      onClick={() => setDraft(draftFromProduct(result))}
                    >
                      <span className="font-medium">{result.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[result.brand, `${result.carbs ?? 0} ${t("nutrition.add.carbs_short")}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Manual entry / review before saving. Nutrition is per 100 g/ml. */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("nutrition.add.name")} className="col-span-2">
            <Input value={draft.name} onChange={(event) => set("name", event.target.value)} />
          </Field>
          <Field label={t("nutrition.add.brand")} className="col-span-2">
            <Input value={draft.brand} onChange={(event) => set("brand", event.target.value)} />
          </Field>
          <Field label={t("nutrition.add.unit")}>
            <Select value={draft.unit} onValueChange={(unit) => set("unit", unit)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <NumberField label={t("nutrition.add.carbs")} value={draft.carbs} onChange={(value) => set("carbs", value)} />
          <NumberField label={t("nutrition.add.fat")} value={draft.fat} onChange={(value) => set("fat", value)} />
          <NumberField label={t("nutrition.add.protein")} value={draft.protein} onChange={(value) => set("protein", value)} />
          <NumberField label={t("nutrition.add.kcal")} value={draft.kcal} onChange={(value) => set("kcal", value)} />
          <NumberField label={t("nutrition.add.serving")} value={draft.serving} onChange={(value) => set("serving", value)} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending && <Spinner className="size-4" />}
            {t("nutrition.add.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Three-dot menu with edit + delete for a single product row. */
export function ProductRowActions({
  existing,
  product,
}: {
  existing: FoodProduct[];
  product: FoodProduct;
}) {
  const { t } = useTranslation();
  const remove = useSyncProducts(() => toast.success(t("nutrition.add.deleted")));

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProductDialog
        existing={existing}
        product={product}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("nutrition.add.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("nutrition.add.delete_confirm", { name: product.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                remove.mutate(existing.filter((entry) => entry !== product))
              }
              className={buttonVariants({ variant: "destructive" })}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
