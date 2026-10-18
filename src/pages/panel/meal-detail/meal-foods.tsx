import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Utensils } from "@/components/icons";
import { ListRow } from "@/components/list-row";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import nutritionService, { type MealEntry } from "@/api/services/nutrition-service";
import { formatAmount, withUnit } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import { MealPhotoFrame } from "./meal-photo";

// The meal's foods. For a photo-estimated meal the photo is the card's other
// half, flush to its edge: the list is what the camera saw, so the two read as
// one thing. Beside each other from lg, the photo on top below it. A missing or
// foreign photo (1602) answers without an image and leaves the plain list.
export function MealFoods({ entries }: { entries: MealEntry[] }) {
  const { t } = useTranslation();
  const photoId = entries.find((entry) => entry.photo_id)?.photo_id;
  const photo = useQuery({
    queryKey: ["meal-photo", photoId],
    queryFn: () => nutritionService.photo(photoId!),
    enabled: !!photoId,
    staleTime: Infinity,
  });
  const image = photo.data?.image;
  const withPhoto = !!photoId && (photo.isLoading || !!image);

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0",
        withPhoto && "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
      )}
    >
      {withPhoto && <MealPhotoFrame image={image} />}
      <div className="flex flex-col gap-2 p-6">
        <CardHeading
          title={t(withPhoto ? "nutrition.meal_detail.photo_foods" : "nutrition.meal_detail.products")}
        />
        <div className="divide-y divide-divider">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("nutrition.meal_detail.no_products")}
            </p>
          ) : (
            entries.map((entry, index) => (
              <EntryRow key={(entry.barcode || entry.name) + index} entry={entry} />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function EntryRow({ entry }: { entry: MealEntry }) {
  const { t } = useTranslation();
  const unit = entry.unit ?? "g";
  const servings = entry.serving && entry.serving > 0 ? entry.amount / entry.serving : null;
  // "2 servings · 60 g" when the product declares a serving size, else "60 g".
  const amount = withUnit(entry.amount, unit);
  const subtitle =
    servings == null
      ? amount
      : `${formatAmount(servings)} ${t(
          servings === 1
            ? "nutrition.meal_detail.serving_one"
            : "nutrition.meal_detail.servings",
        )} · ${amount}`;

  return (
    <ListRow icon={<Utensils />} title={entry.name} subtitle={subtitle} value={withUnit(entry.carbs, "g")} />
  );
}
