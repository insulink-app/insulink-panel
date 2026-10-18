import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import nutritionService from "@/api/services/nutrition-service";

// The photo a meal was estimated from, as the app took it. Shown only when the
// server still has it: a missing or foreign photo (1602) leaves no empty card.
export function MealPhoto({ photoId }: { photoId: string }) {
  const { t } = useTranslation();
  const photo = useQuery({
    queryKey: ["meal-photo", photoId],
    queryFn: () => nutritionService.photo(photoId),
    staleTime: Infinity,
  });
  const image = photo.data?.image;
  if (!image) {
    return null;
  }

  return (
    <Card className="gap-4 p-6">
      <CardHeading title={t("nutrition.meal_detail.photo")} />
      <img
        src={`data:image/jpeg;base64,${image}`}
        alt={t("nutrition.meal_detail.photo_alt")}
        className="max-h-[480px] w-full rounded-lg object-contain"
      />
    </Card>
  );
}
