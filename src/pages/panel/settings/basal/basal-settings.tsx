import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CardSkeleton } from "@/components/card-skeleton";
import { useSettings } from "@/hooks/use-settings";
import { decodeProfiles, encodeProfiles, initialProfile, type BasalProfiles } from "@/lib/basal";
import { BasalEditor } from "./basal-editor";
import { ProfileList } from "./profile-list";

/**
 * The basal tab: the profile list and, beside it, the editor of the profile
 * picked there. Activating, adding and deleting save straight away; curve
 * edits wait for the editor's Speichern. Mirrors the app's basal pages.
 */
export function BasalSettings() {
  const { t } = useTranslation();
  const { settings, save } = useSettings();
  const [selected, setSelected] = useState<number>();
  if (!settings) {
    return <CardSkeleton />;
  }
  const state = decodeProfiles(settings.basal_profiles);
  const current = Math.min(selected ?? state.active, state.profiles.length - 1);
  const persist = (next: BasalProfiles) => save.mutate({ ...settings, basal_profiles: encodeProfiles(next) });
  return (
    <>
      <ProfileList
        state={state}
        selected={current}
        onSelect={setSelected}
        onActivate={(active) => persist({ ...state, active })}
        onAdd={() => {
          const profiles = [...state.profiles, initialProfile(t("basal.new_name", { n: state.profiles.length + 1 }))];
          setSelected(profiles.length - 1);
          persist({ ...state, profiles });
        }}
      />
      <BasalEditor
        key={`${current}:${settings.basal_profiles}`}
        saved={state.profiles[current]}
        active={current === state.active}
        deletable={state.profiles.length > 1}
        saving={save.isPending}
        onSave={(profile) => persist({ ...state, profiles: state.profiles.map((entry, at) => (at === current ? profile : entry)) })}
        onActivate={(profile) =>
          persist({ active: current, profiles: state.profiles.map((entry, at) => (at === current ? profile : entry)) })
        }
        onDelete={() => {
          const profiles = state.profiles.filter((_, at) => at !== current);
          setSelected(undefined);
          persist({ active: Math.min(state.active > current ? state.active - 1 : state.active, profiles.length - 1), profiles });
        }}
      />
    </>
  );
}
