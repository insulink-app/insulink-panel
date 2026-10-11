import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { Stepper } from "@/components/stepper";
import { formatNumber } from "@/lib/format";
import { SettingRow } from "./setting-row";
import type { SettingsFormApi } from "./use-settings-form";

const EXAMPLE_CARBS = 60;
const EXAMPLE_GLUCOSE = 220;

function factors(api: SettingsFormApi) {
  return {
    correction: api.number("bolus_correction_factor", 35),
    carbs: api.number("bolus_carb_factor", 15),
    target: Math.round((api.number("glucose_target_low", 70) + api.number("glucose_target_high", 180)) / 2),
  };
}

/** The two factors the bolus calculator divides by. */
export function BolusForm({ api }: { api: SettingsFormApi }) {
  const { t } = useTranslation();
  const values = factors(api);
  return (
    <>
      <SettingRow label={t("settings.correction_factor")} hint={t("settings.correction_hint")}>
        <Stepper
          value={values.correction}
          onChange={(next) => api.set("bolus_correction_factor", next)}
          step={1}
          min={5}
          max={200}
          unit="mg/dL"
          label={t("settings.correction_factor")}
        />
      </SettingRow>
      <SettingRow label={t("settings.carb_factor")} hint={t("settings.carb_hint")}>
        <Stepper
          value={values.carbs}
          onChange={(next) => api.set("bolus_carb_factor", next)}
          step={1}
          min={1}
          max={100}
          unit={t("settings.units.g")}
          label={t("settings.carb_factor")}
        />
      </SettingRow>
    </>
  );
}

/**
 * A worked example with the factors being edited: a 60 g meal and a correction
 * from 220 mg/dL down to the middle of the target range, which is where the
 * app's calculator aims.
 */
export function BolusExample({ api }: { api: SettingsFormApi }) {
  const { t } = useTranslation();
  const values = factors(api);
  const insulin = t("settings.units.insulin");
  const meal = EXAMPLE_CARBS / values.carbs;
  const correction = Math.max(0, EXAMPLE_GLUCOSE - values.target) / values.correction;
  const rows = [
    {
      label: t("settings.example_meal", { carbs: EXAMPLE_CARBS }),
      formula: `${EXAMPLE_CARBS} g ÷ ${values.carbs}`,
      units: meal,
    },
    {
      label: t("settings.example_correction", { from: EXAMPLE_GLUCOSE, to: values.target }),
      formula: `${EXAMPLE_GLUCOSE - values.target} ÷ ${values.correction}`,
      units: correction,
    },
    { label: t("settings.example_total"), units: meal + correction },
  ];
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("settings.example")} />
      <p className="mt-1 text-sm text-muted-foreground">{t("settings.example_intro")}</p>
      <div className="mt-3 divide-y divide-divider border-t border-divider">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-4 py-4">
            <span className="flex-1 text-[15px]">{row.label}</span>
            {row.formula && <span className="text-[13px] whitespace-nowrap text-muted-foreground">{row.formula}</span>}
            <b className="w-[72px] text-right text-lg font-extrabold whitespace-nowrap text-teal">
              {formatNumber(row.units, 1)} {insulin}
            </b>
          </div>
        ))}
      </div>
      <p className="mt-auto rounded-2xl bg-ground px-4 py-3.5 text-[13px] text-muted-foreground">{t("settings.example_note")}</p>
    </Card>
  );
}
