import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import nutritionService from "@/api/services/nutrition-service";
import settingsService from "@/api/services/settings-service";
import { DEFAULT_TARGET_HIGH, DEFAULT_TARGET_LOW } from "@/lib/glucose";
import { ProductDialog } from "./product-dialog";
import { ProductsView } from "./products-view";
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
  const [adding, setAdding] = useState(false);

  const views = {
    meals: <MealsView meals={meals.data?.meals ?? []} low={low} high={high} unit={unit} />,
    drinks: (
      <DrinksView
        drinks={drinks.data?.drinks ?? []}
        goal={settings?.["nutrition.water_goal_ml"] as number | undefined}
      />
    ),
    products: (
      <ProductsView
        products={productList}
        meals={meals.data?.meals ?? []}
        carbFactor={settings?.bolus_carb_factor ?? 15}
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
            <Button onClick={() => setAdding(true)} className="h-11 rounded-full px-5">
              <Plus className="size-4" />
              {t("nutrition.add.button")}
            </Button>
          )
        }
      />
      {views[current]}
      {current === "products" && <ProductDialog key={String(adding)} existing={productList} open={adding} onOpenChange={setAdding} />}
    </PanelPage>
  );
}
