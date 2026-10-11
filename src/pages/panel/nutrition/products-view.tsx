import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { ScrollPane } from "@/components/scroll-pane";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInfinitePaging } from "@/hooks/use-infinite-paging";
import { withUnit } from "@/lib/nutrition";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FoodProduct, Meal } from "@/api/services/nutrition-service";
import { ProductDetail } from "./product-detail";

type Sort = "name" | "carbs" | "kcal";

const GRID =
  "grid grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,1fr))] items-center gap-4";

const servingCarbs = (product: FoodProduct) =>
  product.serving && product.carbs != null
    ? (product.carbs * product.serving) / 100
    : undefined;

/** The products as a searchable, sortable table beside the selected product's detail. */
export function ProductsView({
  products,
  meals,
  carbFactor,
}: {
  products: FoodProduct[];
  meals: Meal[];
  carbFactor: number;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [selected, setSelected] = useState<FoodProduct>();
  const needle = query.trim().toLowerCase();
  const shown = products
    .filter(
      (product) =>
        !needle ||
        `${product.name ?? ""} ${product.brand ?? ""}`
          .toLowerCase()
          .includes(needle),
    )
    .sort((left, right) =>
      sort === "name"
        ? (left.name ?? "").localeCompare(right.name ?? "")
        : (right[sort] ?? 0) - (left[sort] ?? 0),
    );
  const paging = useInfinitePaging(shown.map((_, index) => index));
  const current = selected && products.includes(selected) ? selected : shown[0];

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card className="gap-0 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="flex-1 text-lg font-extrabold">
            {t("nutrition.products")}
            <span className="ml-2 text-[13px] font-bold text-muted-foreground">
              {formatNumber(products.length)}
            </span>
          </h2>
          <label className="flex h-10 w-full max-w-[340px] items-center gap-2 rounded-full bg-ground px-4">
            <Search
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("nutrition.products_page.search")}
              aria-label={t("nutrition.products_page.search")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-placeholder"
            />
          </label>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as Sort)}
          >
            <SelectTrigger
              aria-label={t("nutrition.products_page.sort")}
              className="h-10 rounded-full border-divider px-4 font-bold"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">
                {t("nutrition.products_page.sort_name")}
              </SelectItem>
              <SelectItem value="carbs">
                {t("nutrition.products_page.sort_carbs")}
              </SelectItem>
              <SelectItem value="kcal">
                {t("nutrition.products_page.sort_kcal")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ScrollPane
          onNearEnd={paging.loadMore}
          hasMore={paging.hasMore}
          loaded={paging.visible}
          minHeight={560}
          header={
            <div className={`${GRID} px-3 text-[11px] font-bold text-label`}>
              <span>{t("nutrition.products_page.col_product")}</span>
              <span>{t("nutrition.products_page.col_carbs")}</span>
              <span>{t("nutrition.products_page.col_kcal")}</span>
              <span>{t("nutrition.products_page.col_serving")}</span>
              <span className="text-right">
                {t("nutrition.products_page.col_carbs_serving")}
              </span>
            </div>
          }
        >
          <ul className="divide-y divide-divider border-t border-divider">
            {shown.slice(0, paging.visible).map((product, index) => {
              const active = product === current;
              return (
                <li key={product.barcode ?? index}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(product)}
                    className={cn(
                      `${GRID} relative w-full px-3 py-3.5 text-left text-sm transition-colors`,
                      active
                        ? "bg-raised before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-brand"
                        : "hover:bg-raised/60",
                    )}
                  >
                    <span className="min-w-0">
                      <b className="block truncate">{product.name ?? "–"}</b>
                      <span className="block truncate text-xs text-muted-foreground">
                        {product.brand || "–"}
                      </span>
                    </span>
                    <span className="whitespace-nowrap">
                      {withUnit(product.carbs, "g")}
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground">
                      {withUnit(product.kcal, "kcal")}
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground">
                      {product.serving
                        ? withUnit(product.serving, product.unit ?? "g")
                        : "–"}
                    </span>
                    <b className="text-right whitespace-nowrap">
                      {withUnit(servingCarbs(product), "g")}
                    </b>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollPane>
      </Card>
      <ProductDetail
        product={current}
        products={products}
        meals={meals}
        carbFactor={carbFactor}
      />
    </div>
  );
}
