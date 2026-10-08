import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Plus, Trash2 } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { BasalChart } from "@/components/basal-chart";
import { CardSkeleton } from "@/components/card-skeleton";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import {
  decodeProfiles,
  deliveredTotal,
  encodeProfiles,
  initialProfile,
  type BasalProfile,
  type BasalProfiles,
} from "@/lib/basal";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "../settings/section-nav";

// Lists the basal-rate profiles: each card has a radio to make it the active
// one, its name + daily total and a preview of its curve; clicking a card opens
// the editor. Mirrors the app's ProfileBasalSelection. Selecting/adding/deleting
// saves straight away — only the curve edits get an explicit Save (in the
// editor).
export default function BasalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings, save } = useSettings();
  const [adding, setAdding] = useState(false);

  if (!settings) {
    return (
      <PanelPage title={t("basal.title")} parents={[{ title: t("nav.settings") }]}>
        <CardSkeleton />
      </PanelPage>
    );
  }

  const state = decodeProfiles(settings.basal_profiles);

  const persist = (next: BasalProfiles, onSaved?: () => void) =>
    save.mutate(
      { ...settings, basal_profiles: encodeProfiles(next) },
      { onSuccess: onSaved },
    );

  const addProfile = (name: string) => {
    const profiles = [...state.profiles, initialProfile(name)];
    setAdding(false);
    persist({ ...state, profiles }, () => navigate(`/settings/basal/${profiles.length - 1}`));
  };

  const deleteProfile = (index: number) => {
    const profiles = state.profiles.filter((_, at) => at !== index);
    persist({ active: Math.min(state.active, profiles.length - 1), profiles });
  };

  return (
    <PanelPage title={t("basal.title")} parents={[{ title: t("nav.settings") }]}>
      <PageHeader title={t("nav.settings")} />
      <SettingsNav current="basal" />
      <div className="flex w-full max-w-2xl flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("settings.desc_basal")}</p>

        <RadioGroup
          value={String(state.active)}
          onValueChange={(value) => persist({ ...state, active: Number(value) })}
          className="gap-3"
        >
          {state.profiles.map((profile, index) => (
            <ProfileCard
              key={index}
              profile={profile}
              index={index}
              active={index === state.active}
              deletable={state.profiles.length > 1}
              onDelete={() => deleteProfile(index)}
            />
          ))}
        </RadioGroup>

        <Button
          variant="outline"
          className="h-14 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
          {t("basal.add_profile")}
        </Button>
      </div>

      <AddProfileDialog open={adding} onOpenChange={setAdding} onAdd={addProfile} />
    </PanelPage>
  );
}

function ProfileCard({
  profile,
  index,
  active,
  deletable,
  onDelete,
}: {
  profile: BasalProfile;
  index: number;
  active: boolean;
  deletable: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/settings/basal/${index}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          navigate(`/settings/basal/${index}`);
        }
      }}
      className={cn(
        "cursor-pointer rounded-3xl border bg-card p-5 transition-colors hover:border-primary/60",
        active && "border-primary ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-center gap-3">
        {/* The radio only picks the active profile — it must not open the editor. */}
        <span onClick={(event) => event.stopPropagation()}>
          <RadioGroupItem value={String(index)} id={`basal-${index}`} />
        </span>
        <Label htmlFor={`basal-${index}`} onClick={(event) => event.stopPropagation()}>
          <span className="flex flex-col items-start">
            <span className="font-semibold">{profile.name}</span>
            <span className="text-xs text-muted-foreground">
              {t("basal.total", { total: formatNumber(deliveredTotal(profile), 2) })}
            </span>
          </span>
        </Label>
        <span className="ml-auto flex items-center gap-1">
          {deletable && (
            <span onClick={(event) => event.stopPropagation()}>
              <ConfirmDelete onConfirm={onDelete} title={t("basal.delete_title")}>
                <Button variant="ghost" size="icon" aria-label={t("common.delete")}>
                  <Trash2 className="size-4" />
                </Button>
              </ConfirmDelete>
            </span>
          )}
          <ChevronRight className="size-4 text-muted-foreground" />
        </span>
      </div>

      <BasalChart rates={profile.rates} height={80} />
    </div>
  );
}

function AddProfileDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setName("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("basal.new_title")}</DialogTitle>
        </DialogHeader>
        <Label htmlFor="basal-new-name">{t("basal.name")}</Label>
        <Input
          id="basal-new-name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) {
              onAdd(name.trim());
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={!name.trim()} onClick={() => onAdd(name.trim())}>
            {t("basal.add_profile")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
