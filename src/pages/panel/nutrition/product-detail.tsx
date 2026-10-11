import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Trash2, Utensils } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/confirm-delete";
import { formatAmount } from "@/lib/nutrition";
import { formatNumber } from "@/lib/format";
import { formatDay } from "@/lib/when";
import type { FoodProduct, Meal } from "@/api/services/nutrition-service";
import { ProductDialog } from "./product-dialog";
import { useSyncProducts } from "./use-sync-products";

const MACROS = [
  { key: "carbs", labelKey: "nutrition.add.carbs", color: "var(--brand)" },
  { key: "fat", labelKey: "nutrition.add.fat", color: "var(--high)" },
  { key: "protein", labelKey: "nutrition.add.protein", color: "var(--teal)" },
] as const;

/**
 * One product: its nutrition per 100 g with the macro split, one serving with
 * the bolus the carb factor gives for it, and how often meals used it.
 */
export function ProductDetail({
  product,
  products,
  meals,
  carbFactor,
}: {
  product?: FoodProduct;
  products: FoodProduct[];
  meals: Meal[];
  carbFactor: number;
}) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const remove = useSyncProducts(() => toast.success(t("nutrition.add.deleted")));
  if (!product) {
    return (
      <Card className="grid place-items-center p-6">
        <p className="text-sm text-muted-foreground">{t("nutrition.products_page.choose")}</p>
      </Card>
    );
  }
  const unit = product.unit ?? "g";
  const servingAmount = product.serving ? `${formatAmount(product.serving)} ${unit}` : undefined;
  const servingCarbs = product.serving ? ((product.carbs ?? 0) * product.serving) / 100 : undefined;
  const servingKcal = product.serving ? ((product.kcal ?? 0) * product.serving) / 100 : undefined;
  const uses = meals
    .filter((meal) =>
      (meal.entries ?? []).some((entry) => (product.barcode && entry.barcode === product.barcode) || entry.name === product.name),
    )
    .sort((left, right) => right.time - left.time);
  const macroTotal = MACROS.reduce((sum, macro) => sum + (product[macro.key] ?? 0), 0);

  return (
    <Card className="gap-0 p-6">
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <h2 className="truncate text-[22px] leading-tight font-extrabold">{product.name}</h2>
          <span className="text-[13px] text-muted-foreground">
            {[product.brand, servingAmount && t("nutrition.products_page.serving_short", { amount: servingAmount })].filter(Boolean).join(" · ")}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-divider px-4 text-sm font-bold hover:bg-raised"
        >
          <Pencil className="size-4" aria-hidden />
          {t("common.edit")}
        </button>
        <ConfirmDelete
          title={t("nutrition.add.delete_title")}
          description={t("nutrition.add.delete_confirm", { name: product.name ?? "" })}
          onConfirm={() => remove.mutate(products.filter((entry) => entry !== product))}
        >
          <button
            type="button"
            aria-label={t("common.delete")}
            className="grid size-10 place-items-center rounded-full bg-raised text-low hover:bg-raised-strong"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </ConfirmDelete>
      </div>

      <Section title={t("nutrition.products_page.per_100", { unit })}>
        <div className="grid grid-cols-4">
          {[...MACROS, { key: "kcal", labelKey: "nutrition.add.kcal" } as const].map((macro, index) => (
            <span key={macro.key} className={index ? "border-l border-divider pl-4" : ""}>
              <span className="block text-[13px] text-muted-foreground">{t(macro.labelKey)}</span>
              <span className="mt-1 block whitespace-nowrap">
                <b className="text-2xl font-extrabold">{formatAmount(product[macro.key] ?? 0)}</b>
                <span className="text-xs font-bold text-muted-foreground"> {macro.key === "kcal" ? "kcal" : "g"}</span>
              </span>
            </span>
          ))}
        </div>
        {macroTotal > 0 && (
          <>
            <div className="mt-5 flex h-2.5 gap-1" aria-hidden>
              {MACROS.map((macro) => (
                <i
                  key={macro.key}
                  className="block min-w-1.5 rounded-full"
                  style={{ flexGrow: product[macro.key] ?? 0, backgroundColor: macro.color }}
                />
              ))}
            </div>
            <div className="mt-2.5 flex gap-4 text-xs text-muted-foreground">
              {MACROS.map((macro) => (
                <span key={macro.key} className="flex items-center gap-1.5">
                  <i className="block size-2 rounded-full" style={{ backgroundColor: macro.color }} aria-hidden />
                  {t(macro.labelKey)}
                </span>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title={t("nutrition.products_page.per_serving")}>
        {servingAmount && servingCarbs !== undefined ? (
          <div className="divide-y divide-divider">
            <Row
              title={t("nutrition.products_page.serving_line", { amount: servingAmount })}
              value={t("nutrition.products_page.carbs_value", { value: formatAmount(Math.round(servingCarbs * 10) / 10) })}
              detail={`${formatNumber(servingKcal ?? 0)} kcal`}
            />
            <Row
              title={t("nutrition.products_page.matching_bolus")}
              subtitle={t("nutrition.products_page.with_factor", { factor: carbFactor })}
              value={`${formatNumber(servingCarbs / carbFactor, 1)} ${t("nutrition.unit_insulin")}`}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("nutrition.products_page.no_serving")}</p>
        )}
      </Section>

      <Section title={t("nutrition.products_page.usage")}>
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
            <Utensils className="size-4" aria-hidden />
          </span>
          <span>
            <b className="block text-sm">
              {uses.length ? t("nutrition.products_page.used_in", { count: uses.length }) : t("nutrition.products_page.never_used")}
            </b>
            {uses[0] && (
              <span className="text-xs text-muted-foreground">
                {t("nutrition.products_page.last_used", { when: formatDay(uses[0].time, t, i18n.language) })}
              </span>
            )}
          </span>
        </div>
      </Section>

      <ProductDialog key={product.barcode} existing={products} product={product} open={editing} onOpenChange={setEditing} />
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-3 text-[13px] font-extrabold text-brand-text">{title}</h3>
      {children}
    </section>
  );
}

function Row({ title, subtitle, value, detail }: { title: string; subtitle?: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="min-w-0 flex-1">
        <b className="block text-sm">{title}</b>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      <span className="text-right whitespace-nowrap">
        <b className="block text-sm">{value}</b>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </span>
    </div>
  );
}
