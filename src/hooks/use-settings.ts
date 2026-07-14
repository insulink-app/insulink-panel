import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import settingsService, { type UserSettings } from "@/api/services/settings-service";

// The shared settings blob plus its save mutation. Every settings panel reads
// the same query and saves the COMPLETE blob back (the backend full-replaces),
// so app-only keys survive.
export function useSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });

  const save = useMutation({
    mutationFn: (next: UserSettings) => settingsService.change(next),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("settings.saved"));
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      } else {
        toast.error(t("settings.save_failed"));
      }
    },
    onError: () => toast.error(t("settings.save_failed")),
  });

  return { settings: data, save };
}
