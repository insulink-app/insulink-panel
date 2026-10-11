import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import nutritionService, { type FoodProduct } from "@/api/services/nutrition-service";

/**
 * Full-replace write of the product set: the whole list with one product
 * added, replaced or removed, then a refresh. Shared by add, edit and delete.
 */
export function useSyncProducts(onDone?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (products: FoodProduct[]) => nutritionService.syncProducts(products),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onDone?.();
    },
    onError: () => toast.error(t("nutrition.add.save_failed")),
  });
}
