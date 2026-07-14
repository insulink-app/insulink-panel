import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ChevronRight, CupSoda, Droplet, GlassWater, Milk, Plus } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { DataList, type ListColumn } from "@/components/data-list";
import nutritionService, {
  type Drink,
  type FoodProduct,
  type Meal,
} from "@/api/services/nutrition-service";
import settingsService from "@/api/services/settings-service";
import {
  classify,
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  statusColorVar,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";
import ProductDialog, { ProductRowActions } from "./add-product-dialog";
import { drinkKind, withUnit } from "@/lib/nutrition";
import { Button } from "@/components/ui/button";

export default function NutritionPage() {
  const { t } = useTranslation();
  const { view } = useParams();
  const navigate = useNavigate();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const meals = useQuery({ queryKey: ["meals"], queryFn: nutritionService.meals });
  const drinks = useQuery({ queryKey: ["drinks"], queryFn: nutritionService.drinks });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: nutritionService.products,
  });

  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;

  const mealCols: ListColumn<Meal>[] = [
    { header: t("nutrition.col_time"), cell: (meal) => <TimeCell at={meal.time} /> },
    {
      header: t("nutrition.col_carbs"),
      cell: (meal) => (
        <span className="font-semibold tabular-nums">{withUnit(meal.carbs, "g")}</span>
      ),
    },
    {
      header: t("nutrition.col_glucose"),
      cell: (meal) =>
        meal.glucose == null ? (
          "–"
        ) : (
          <span
            className="font-semibold tabular-nums"
            style={{ color: statusColorVar[classify(meal.glucose, low, high)] }}
          >
            {toDisplay(meal.glucose, unit)} {unitLabel(unit)}
          </span>
        ),
    },
    {
      header: t("nutrition.col_bolus"),
      cell: (meal) =>
        meal.bolus == null
          ? "–"
          : `${meal.bolus.toFixed(1)} ${t("nutrition.unit_insulin")}`,
    },
    {
      header: t("nutrition.col_products"),
      cell: (meal) => <ProductsCell entries={meal.entries ?? []} />,
    },
    {
      header: "",
      className: "w-10 text-right",
      cell: () => <ChevronRight className="size-4 text-muted-foreground" />,
    },
  ];

  const drinkCols: ListColumn<Drink>[] = [
    { header: t("nutrition.col_time"), cell: (drink) => <TimeCell at={drink.at} /> },
    {
      header: t("nutrition.col_type"),
      cell: (drink) => (
        <span className="flex items-center gap-2">
          <DrinkIcon kind={drink.kind} className="size-4 text-primary" />
          {t("nutrition.kind_" + drinkKind(drink.kind))}
        </span>
      ),
    },
    {
      header: t("nutrition.col_amount"),
      className: "text-right",
      cell: (drink) => (
        <span className="font-semibold tabular-nums">{drink.ml} ml</span>
      ),
    },
  ];

  const productList = products.data?.products ?? [];
  const productCols: ListColumn<FoodProduct>[] = [
    {
      header: t("nutrition.col_name"),
      cell: (product) => (
        <div>
          <div className="font-medium">{product.name ?? "–"}</div>
          {product.brand && (
            <div className="text-xs text-muted-foreground">{product.brand}</div>
          )}
        </div>
      ),
    },
    {
      header: t("nutrition.col_carbs_100"),
      cell: (product) => (
        <span className="tabular-nums">{withUnit(product.carbs, "g")}</span>
      ),
    },
    {
      header: t("nutrition.col_kcal_100"),
      cell: (product) => (
        <span className="tabular-nums">{withUnit(product.kcal, "kcal")}</span>
      ),
    },
    {
      header: t("nutrition.col_serving"),
      cell: (product) =>
        product.serving ? withUnit(product.serving, product.unit ?? "g") : "–",
    },
    {
      header: "",
      className: "w-10 text-right",
      cell: (product) => <ProductRowActions existing={productList} product={product} />,
    },
  ];

  const byNewest = <T,>(list: T[], at: (row: T) => number) =>
    list.slice().sort((left, right) => at(right) - at(left));

  const views = {
    meals: (
      <DataList
        title={t("nutrition.meals")}
        columns={mealCols}
        data={byNewest(meals.data?.meals ?? [], (meal) => meal.time)}
        isLoading={meals.isLoading}
        onRowClick={(meal) => navigate(`/nutrition/meals/${meal.time}`)}
      />
    ),
    drinks: (
      <DataList
        title={t("nutrition.drinks")}
        columns={drinkCols}
        data={byNewest(drinks.data?.drinks ?? [], (drink) => drink.at)}
        isLoading={drinks.isLoading}
      />
    ),
    products: (
      <div className="space-y-4">
        <div className="flex justify-end">
          <ProductDialog
            existing={productList}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                {t("nutrition.add.button")}
              </Button>
            }
          />
        </div>
        <DataList
          title={t("nutrition.products")}
          columns={productCols}
          data={productList}
          isLoading={products.isLoading}
        />
      </div>
    ),
  };

  const current = view != null && view in views ? (view as keyof typeof views) : "meals";

  return (
    <PanelPage
      title={t("nutrition." + current)}
      parents={[{ title: t("nav.nutrition") }]}
    >
      <div className="py-6">{views[current]}</div>
    </PanelPage>
  );
}

const DRINK_ICONS = {
  glass: GlassWater,
  small_bottle: CupSoda,
  sodastream: Milk,
  large_bottle: Milk,
  free: Droplet,
} as const;

function DrinkIcon({ kind, className }: { kind?: string; className?: string }) {
  const Icon = DRINK_ICONS[drinkKind(kind) as keyof typeof DRINK_ICONS];
  return <Icon className={className} />;
}

/** Date over time, so a long list stays scannable by day. */
function TimeCell({ at }: { at: number }) {
  return (
    <div>
      <div className="font-medium">{format(new Date(at), "dd.MM.yyyy")}</div>
      <div className="text-xs text-muted-foreground">
        {format(new Date(at), "HH:mm")}
      </div>
    </div>
  );
}

/** First logged product, plus a "+n" chip for the rest. */
function ProductsCell({ entries }: { entries: { name: string }[] }) {
  const { t } = useTranslation();
  if (entries.length === 0) {
    return <span className="text-muted-foreground">{t("nutrition.manual_entry")}</span>;
  }
  return (
    <span className="flex items-center gap-2">
      <span className="max-w-40 truncate">{entries[0].name}</span>
      {entries.length > 1 && (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{entries.length - 1}
        </span>
      )}
    </span>
  );
}
