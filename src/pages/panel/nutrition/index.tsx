import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import PanelPage from "@/layouts/panel";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/table";
import nutritionService, {
  type Drink,
  type FoodProduct,
  type Meal,
} from "@/api/services/nutrition-service";

const ms = (t?: number) => (t ? format(new Date(t), "dd.MM.yyyy HH:mm") : "–");
const num = (v?: number) => (v == null ? "–" : String(v));

const mealCols: ColumnDef<Meal, unknown>[] = [
  { accessorKey: "time", header: "Zeitpunkt", cell: ({ row }) => ms(row.original.time) },
  { accessorKey: "carbs", header: "KH (g)", cell: ({ row }) => num(row.original.carbs) },
  { accessorKey: "glucose", header: "Glukose", cell: ({ row }) => num(row.original.glucose) },
  { accessorKey: "bolus", header: "Bolus", cell: ({ row }) => num(row.original.bolus) },
];

const drinkCols: ColumnDef<Drink, unknown>[] = [
  { accessorKey: "at", header: "Zeitpunkt", cell: ({ row }) => ms(row.original.at) },
  { accessorKey: "ml", header: "ml", cell: ({ row }) => num(row.original.ml) },
  { accessorKey: "kind", header: "Art", cell: ({ row }) => row.original.kind ?? "–" },
];

const productCols: ColumnDef<FoodProduct, unknown>[] = [
  { accessorKey: "name", header: "Name", cell: ({ row }) => row.original.name ?? "–" },
  { accessorKey: "brand", header: "Marke", cell: ({ row }) => row.original.brand ?? "–" },
  { accessorKey: "carbs", header: "KH/100g", cell: ({ row }) => num(row.original.carbs) },
  { accessorKey: "kcal", header: "kcal/100g", cell: ({ row }) => num(row.original.kcal) },
];

export default function NutritionPage() {
  const meals = useQuery({ queryKey: ["meals"], queryFn: nutritionService.meals });
  const drinks = useQuery({ queryKey: ["drinks"], queryFn: nutritionService.drinks });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: nutritionService.products,
  });

  return (
    <PanelPage title="Ernährung">
      <div className="py-6">
        <Tabs defaultValue="meals">
          <TabsList>
            <TabsTrigger value="meals">Mahlzeiten</TabsTrigger>
            <TabsTrigger value="drinks">Getränke</TabsTrigger>
            <TabsTrigger value="products">Produkte</TabsTrigger>
          </TabsList>
          <TabsContent value="meals">
            <Card>
              <CardContent className="pt-6">
                <DataTable
                  name="meals"
                  columns={mealCols}
                  data={meals.data?.meals ?? []}
                  isLoading={meals.isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="drinks">
            <Card>
              <CardContent className="pt-6">
                <DataTable
                  name="drinks"
                  columns={drinkCols}
                  data={drinks.data?.drinks ?? []}
                  isLoading={drinks.isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="products">
            <Card>
              <CardContent className="pt-6">
                <DataTable
                  name="products"
                  columns={productCols}
                  data={products.data?.products ?? []}
                  isLoading={products.isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PanelPage>
  );
}
