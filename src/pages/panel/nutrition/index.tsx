import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { DataList, type ListColumn } from "@/components/data-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import nutritionService, { type FoodProduct } from "@/api/services/nutrition-service";
import settingsService from "@/api/services/settings-service";
import { DEFAULT_TARGET_HIGH, DEFAULT_TARGET_LOW } from "@/lib/glucose";
import { withUnit } from "@/lib/nutrition";
import ProductDialog, { ProductRowActions } from "./add-product-dialog";
import { MealsView } from "./meals-view";
import { DrinksView } from "./drinks-view";

export default function NutritionPage() {
  const { t } = useTranslation();
  const { view } = useParams();

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

  const views = {
    meals: <MealsView meals={meals.data?.meals ?? []} low={low} high={high} unit={unit} />,
    drinks: (
      <DrinksView
        drinks={drinks.data?.drinks ?? []}
        goal={settings?.["nutrition.water_goal_ml"] as number | undefined}
      />
    ),
    products: (
      <DataList
        title={t("nutrition.products")}
        columns={productCols}
        data={productList}
        isLoading={products.isLoading}
      />
    ),
  };

  const current = view != null && view in views ? (view as keyof typeof views) : "meals";

  return (
    <PanelPage
      title={t("nutrition." + current)}
      parents={[{ title: t("nav.nutrition") }]}
    >
      <PageHeader
        title={t("nutrition." + current)}
        actions={
          current === "products" && (
            <ProductDialog
              existing={productList}
              trigger={
                <Button>
                  <Plus className="size-4" />
                  {t("nutrition.add.button")}
                </Button>
              }
            />
          )
        }
      />
      {views[current]}
    </PanelPage>
  );
}
