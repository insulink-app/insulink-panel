import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import PanelPage from "@/layouts/panel";
import { DataList, type ListColumn } from "@/components/data-list";
import nutritionService, {
  type Drink,
  type FoodProduct,
  type Meal,
} from "@/api/services/nutrition-service";
import ProductDialog, { ProductRowActions } from "./add-product-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const ms = (at?: number) => (at ? format(new Date(at), "dd.MM.yyyy HH:mm") : "–");
const num = (v?: number) => (v == null ? "–" : String(v));

export default function NutritionPage() {
  const { t } = useTranslation();
  const { view } = useParams();

  const mealCols: ListColumn<Meal>[] = [
    { header: t("nutrition.col_time"), cell: (m) => ms(m.time) },
    { header: t("nutrition.col_carbs"), cell: (m) => num(m.carbs) },
    { header: t("nutrition.col_glucose"), cell: (m) => num(m.glucose) },
    { header: t("nutrition.col_bolus"), cell: (m) => num(m.bolus) },
  ];
  const drinkCols: ListColumn<Drink>[] = [
    { header: t("nutrition.col_time"), cell: (d) => ms(d.at) },
    { header: t("nutrition.col_ml"), cell: (d) => num(d.ml) },
    { header: t("nutrition.col_type"), cell: (d) => d.kind ?? "–" },
  ];
  const meals = useQuery({ queryKey: ["meals"], queryFn: nutritionService.meals });
  const drinks = useQuery({ queryKey: ["drinks"], queryFn: nutritionService.drinks });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: nutritionService.products,
  });

  const productList = products.data?.products ?? [];
  const productCols: ListColumn<FoodProduct>[] = [
    { header: t("nutrition.col_name"), cell: (p) => p.name ?? "–" },
    { header: t("nutrition.col_brand"), cell: (p) => p.brand ?? "–" },
    { header: t("nutrition.col_carbs_100"), cell: (p) => num(p.carbs) },
    { header: t("nutrition.col_kcal_100"), cell: (p) => num(p.kcal) },
    {
      header: "",
      className: "text-right",
      cell: (p) => <ProductRowActions existing={productList} product={p} />,
    },
  ];

  const views = {
    meals: (
      <DataList
        title={t("nutrition.meals")}
        columns={mealCols}
        data={meals.data?.meals ?? []}
        isLoading={meals.isLoading}
      />
    ),
    drinks: (
      <DataList
        title={t("nutrition.drinks")}
        columns={drinkCols}
        data={drinks.data?.drinks ?? []}
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

  return (
    <PanelPage title={t("nutrition.title")}>
      <div className="py-6">{views[(view as keyof typeof views) ?? "meals"] ?? views.meals}</div>
    </PanelPage>
  );
}
