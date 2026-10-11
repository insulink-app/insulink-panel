import { useState } from "react";
import { type UserSettings } from "@/api/services/settings-service";
import { useSettings } from "@/hooks/use-settings";

/** When this panel session last saved the settings; survives switching tabs. */
let lastSavedAt: number | undefined;

export interface SettingsFormApi {
  form: UserSettings;
  set: (key: string, value: unknown) => void;
  /** The stored number under `key`, or the app's default. */
  number: (key: string, fallback: number) => number;
}

/**
 * A local copy of the whole settings blob for one tab's form. The full blob is
 * kept so app-only keys survive the full-replace save; fresh server data resets
 * the copy.
 */
export function useSettingsForm() {
  const { settings, save } = useSettings();
  const [form, setForm] = useState<UserSettings>({});
  const [synced, setSynced] = useState<UserSettings>();
  const [savedAt, setSavedAt] = useState(lastSavedAt);
  if (settings && settings !== synced) {
    setSynced(settings);
    setForm(settings);
  }
  const api: SettingsFormApi = {
    form,
    set: (key, value) => setForm((current) => ({ ...current, [key]: value })),
    number: (key, fallback) => (typeof form[key] === "number" ? (form[key] as number) : fallback),
  };
  return {
    api,
    loaded: settings !== undefined,
    dirty: synced !== undefined && JSON.stringify(form) !== JSON.stringify(synced),
    saving: save.isPending,
    savedAt,
    reset: () => setForm(synced ?? {}),
    submit: () =>
      save.mutate(form, {
        onSuccess: (response) => {
          if (response.success) {
            lastSavedAt = Date.now();
            setSavedAt(lastSavedAt);
          }
        },
      }),
  };
}
