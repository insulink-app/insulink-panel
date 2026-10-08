import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChartLine, Minus, Plus } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { BasalChart } from "@/components/basal-chart";
import { CardSkeleton } from "@/components/card-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useSettings } from "@/hooks/use-settings";
import {
  BASAL_STEP,
  decodeProfiles,
  deliveredTotal,
  encodeProfiles,
  regenerate,
  snapRate,
  type BasalPeak,
  type BasalProfile,
} from "@/lib/basal";
import { BasalPeakRow } from "./peak-row";
import { formatNumber } from "@/lib/format";

// Edits one basal profile: rename it, click a bar and step the hour's rate, or
// shape the whole curve from a daily total plus movable maxima. Mirrors the
// app's BasalEditor — a local copy that only reaches the account on Save.
export default function BasalEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { index } = useParams();
  const { settings, save } = useSettings();
  const editing = Number(index);

  const [profile, setProfile] = useState<BasalProfile>();
  const [selectedHour, setSelectedHour] = useState(8);
  const [totalInput, setTotalInput] = useState("");

  // Adopt the profile from the server blob once it arrives, dropping local edits.
  const [synced, setSynced] = useState<string>();
  const loaded = settings ? decodeProfiles(settings.basal_profiles) : undefined;
  if (settings && settings.basal_profiles !== synced) {
    const current = loaded?.profiles[editing];
    setSynced(settings.basal_profiles as string);
    if (current) {
      setProfile(current);
      setTotalInput(String(current.total));
    }
  }

  if (!settings || !loaded) {
    return (
      <PanelPage title={t("basal.title")} parents={[{ title: t("nav.settings") }]}>
        <CardSkeleton />
      </PanelPage>
    );
  }

  // A deleted (or hand-typed) index has no profile to edit — back to the list.
  if (!profile) {
    navigate("/settings/basal", { replace: true });
    return null;
  }

  const setHour = (hour: number, rate: number) => {
    const rates = [...profile.rates];
    rates[hour] = snapRate(rate);
    setProfile({ ...profile, rates });
  };

  const applyGenerator = (peaks: BasalPeak[] = profile.peaks) => {
    const total = Number(totalInput.replace(",", ".")) || 0;
    setProfile(regenerate({ ...profile, peaks, total }));
  };

  const persist = () => {
    const profiles = loaded.profiles.map((entry, at) => (at === editing ? profile : entry));
    save.mutate(
      { ...settings, basal_profiles: encodeProfiles({ ...loaded, profiles }) },
      { onSuccess: () => navigate("/settings/basal") },
    );
  };

  return (
    <PanelPage
      title={profile.name}
      parents={[
        { title: t("nav.settings") },
        { title: t("basal.title"), href: "/settings/basal" },
      ]}
    >
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="basal-name">{t("basal.name")}</Label>
            <Input
              id="basal-name"
              className="w-64"
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
          </div>

          <span className="text-sm font-semibold">
            {t("basal.total", { total: formatNumber(deliveredTotal(profile), 2) })}
          </span>

          <BasalChart
            rates={profile.rates}
            selectedHour={selectedHour}
            onSelectHour={setSelectedHour}
          />

          <div className="flex items-center justify-between rounded-xl border p-4">
            <Button
              variant="outline"
              size="icon"
              aria-label={t("basal.decrease")}
              onClick={() => setHour(selectedHour, profile.rates[selectedHour] - BASAL_STEP)}
            >
              <Minus className="size-4" />
            </Button>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-extrabold">
                {String(selectedHour).padStart(2, "0")}:00
              </span>
              <span className="text-sm font-semibold text-primary">
                {t("basal.rate", { rate: formatNumber(profile.rates[selectedHour], 2) })}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("basal.increase")}
              onClick={() => setHour(selectedHour, profile.rates[selectedHour] + BASAL_STEP)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <ChartLine className="size-5 text-primary" />
            <h3 className="font-bold">{t("basal.generate")}</h3>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="basal-total">{t("basal.daily_total")}</Label>
              <Input
                id="basal-total"
                type="number"
                min={0}
                step={0.5}
                className="w-32"
                value={totalInput}
                onChange={(event) => setTotalInput(event.target.value)}
              />
            </div>
            <Button onClick={() => applyGenerator()}>{t("basal.apply")}</Button>
          </div>

          <div className="divide-y">
            {profile.peaks.map((peak, at) => (
              <BasalPeakRow
                key={at}
                peak={peak}
                onChange={(next) =>
                  applyGenerator(profile.peaks.map((entry, index) => (index === at ? next : entry)))
                }
                onDelete={() => applyGenerator(profile.peaks.filter((_, index) => index !== at))}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => applyGenerator([...profile.peaks, { h: 14, w: 1 }])}
          >
            <Plus className="mr-1 size-4" />
            {t("basal.add_peak")}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button disabled={save.isPending} onClick={persist}>
            {t("common.save")}
            {save.isPending && <Spinner className="ml-2" />}
          </Button>
          <Button variant="outline" onClick={() => navigate("/settings/basal")}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </PanelPage>
  );
}
