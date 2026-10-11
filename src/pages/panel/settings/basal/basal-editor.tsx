import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon, ChevronLeft, ChevronRight, Plus, Trash2 } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Stepper } from "@/components/stepper";
import { BASAL_MAX_RATE, BASAL_STEP, deliveredTotal, regenerate, snapRate, type BasalPeak, type BasalProfile } from "@/lib/basal";
import { formatNumber } from "@/lib/format";
import { BasalStepChart } from "./basal-step-chart";
import { BasalPeakRow } from "./peak-row";
import { RoundButton } from "./round-button";

const pad = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/**
 * Edits one profile in place: its name, the rate of the selected hour, or the
 * whole curve from a daily total plus movable maxima. A local copy, reaching
 * the account only on Speichern.
 */
export function BasalEditor({
  saved,
  active,
  deletable,
  saving,
  onSave,
  onActivate,
  onDelete,
}: {
  saved: BasalProfile;
  active: boolean;
  deletable: boolean;
  saving: boolean;
  onSave: (profile: BasalProfile) => void;
  /** Makes this profile the active one, saving its edits with it. */
  onActivate: (profile: BasalProfile) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(saved);
  const [hour, setHour] = useState(8);
  const insulin = t("settings.units.insulin");

  const setRate = (rate: number) => {
    const rates = [...profile.rates];
    rates[hour] = snapRate(rate);
    setProfile({ ...profile, rates });
  };
  const generate = (peaks: BasalPeak[] = profile.peaks, total = profile.total) =>
    setProfile(regenerate({ ...profile, peaks, total }));

  return (
    <Card className="gap-0 p-6">
      <div className="flex items-end gap-6">
        <label className="min-w-0 flex-1">
          <span className="text-[13px] text-muted-foreground">{t("basal.name")}</span>
          <Input
            className="mt-1.5 h-11 rounded-2xl bg-ground text-[15px] font-bold"
            value={profile.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
          />
        </label>
        <span className="text-right whitespace-nowrap">
          <span className="block text-[13px] text-muted-foreground">{t("basal.daily_total")}</span>
          <b className="text-[28px] leading-tight font-extrabold">{formatNumber(deliveredTotal(profile), 2)}</b>
          <span className="text-sm font-bold text-muted-foreground"> {insulin}</span>
        </span>
      </div>

      <div className="mt-6">
        <BasalStepChart rates={profile.rates} height={200} selectedHour={hour} onSelectHour={setHour} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-ground p-3">
        <span className="flex items-center gap-2">
          <RoundButton label={t("basal.previous_hour")} onClick={() => setHour((hour + 23) % 24)}>
            <ChevronLeft className="size-4" />
          </RoundButton>
          <b className="min-w-[124px] text-center text-[15px] whitespace-nowrap">
            {pad(hour)} – {pad(hour + 1)}
          </b>
          <RoundButton label={t("basal.next_hour")} onClick={() => setHour((hour + 1) % 24)}>
            <ChevronRight className="size-4" />
          </RoundButton>
        </span>
        <Stepper
          value={profile.rates[hour]}
          onChange={setRate}
          step={BASAL_STEP}
          max={BASAL_MAX_RATE}
          digits={2}
          unit={t("settings.units.insulin_per_hour")}
          label={t("basal.rate_label")}
          className="bg-panel"
        />
      </div>

      <h3 className="mt-7 text-[13px] font-extrabold text-brand-text">{t("basal.generate")}</h3>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-4">
        <b className="text-[15px]">{t("basal.daily_total")}</b>
        <span className="flex items-center gap-2">
          <Stepper
            value={profile.total}
            onChange={(total) => setProfile({ ...profile, total })}
            step={0.5}
            digits={2}
            max={BASAL_MAX_RATE * 24}
            unit={insulin}
            label={t("basal.daily_total")}
          />
          <button
            type="button"
            onClick={() => generate()}
            className="h-11 rounded-full border border-divider px-4 text-sm font-bold transition-colors hover:bg-raised"
          >
            {t("basal.apply")}
          </button>
        </span>
      </div>
      <div className="divide-y divide-divider">
        {profile.peaks.map((peak, at) => (
          <BasalPeakRow
            key={at}
            peak={peak}
            onChange={(next) => generate(profile.peaks.map((entry, index) => (index === at ? next : entry)))}
            onDelete={() => generate(profile.peaks.filter((_, index) => index !== at))}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => generate([...profile.peaks, { h: 14, w: 1 }])}
        className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-ground text-sm font-bold text-brand-text transition-colors hover:bg-raised"
      >
        <Plus className="size-4" aria-hidden />
        {t("basal.add_peak")}
      </button>

      <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-6">
        {deletable && (
          <ConfirmDelete onConfirm={onDelete} title={t("basal.delete_title")}>
            <button type="button" aria-label={t("common.delete")} className="mr-auto grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-raised hover:text-low">
              <Trash2 className="size-4" aria-hidden />
            </button>
          </ConfirmDelete>
        )}
        {!active && (
          <button type="button" onClick={() => onActivate(profile)} className="h-11 rounded-full px-3 text-sm font-bold text-brand-text hover:underline">
            {t("basal.set_active")}
          </button>
        )}
        <button
          type="button"
          onClick={() => setProfile(saved)}
          className="h-11 rounded-full border border-divider px-4 text-sm font-bold transition-colors hover:bg-raised"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(profile)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Spinner className="size-4" /> : <CheckIcon className="size-4" aria-hidden />}
          {t("common.save")}
        </button>
      </div>
    </Card>
  );
}
