import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { Stepper } from "@/components/stepper";
import sportService from "@/api/services/sport-service";
import { formatNumber } from "@/lib/format";
import { SettingRow } from "./setting-row";
import type { SettingsFormApi } from "./use-settings-form";

const BMI_SCALE = [15, 18.5, 25, 30, 35];

/** Height and stride length, the two inputs of the step distance maths. */
export function BodyForm({ api }: { api: SettingsFormApi }) {
  const { t } = useTranslation();
  const centimetres = t("settings.units.cm");
  return (
    <>
      <SettingRow label={t("settings.height")}>
        <Stepper
          value={api.number("sport.height_cm", 175)}
          onChange={(next) => api.set("sport.height_cm", next)}
          step={1}
          min={100}
          max={250}
          unit={centimetres}
          label={t("settings.height")}
        />
      </SettingRow>
      <SettingRow label={t("settings.stride")}>
        <Stepper
          value={api.number("sport.stride_cm", 75)}
          onChange={(next) => api.set("sport.stride_cm", next)}
          step={1}
          min={40}
          max={120}
          unit={centimetres}
          label={t("settings.stride")}
        />
      </SettingRow>
    </>
  );
}

/** What height and stride turn into: km per 1.000 steps, the step goal in km, and the BMI with the latest weight. */
export function BodyDerived({ api }: { api: SettingsFormApi }) {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ["measurements"], queryFn: sportService.measurements });
  const stride = api.number("sport.stride_cm", 75);
  const height = api.number("sport.height_cm", 175);
  const stepsGoal = api.number("sport.steps_goal", 10000);
  const weight = (data?.entries ?? [])
    .filter((entry) => entry.type === "WEIGHT")
    .sort((left, right) => right.time - left.time)[0]?.value;
  const bmi = weight ? weight / (height / 100) ** 2 : undefined;
  const kilometres = t("settings.units.km");
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("settings.derived")} />
      <div className="mt-3 divide-y divide-divider border-t border-divider">
        <Figure label={t("settings.per_1000_steps")} value={formatNumber(stride / 100, 2)} unit={kilometres} />
        <Figure
          label={t("settings.steps_goal_km", { steps: formatNumber(stepsGoal) })}
          value={formatNumber((stepsGoal * stride) / 100000, 1)}
          unit={kilometres}
        />
        <div className="py-5">
          <span className="text-[13px] text-muted-foreground">
            {weight ? t("settings.bmi_with", { weight: formatNumber(weight, 1) }) : t("settings.bmi_missing")}
          </span>
          {bmi && <b className="mt-1 block text-[32px] leading-tight font-extrabold">{formatNumber(bmi, 1)}</b>}
          <BmiScale bmi={bmi} />
        </div>
      </div>
    </Card>
  );
}

function Figure({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="py-5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="mt-1 block whitespace-nowrap">
        <b className="text-[32px] leading-tight font-extrabold">{value}</b>
        <span className="text-sm font-bold text-muted-foreground"> {unit}</span>
      </span>
    </div>
  );
}

/** The BMI bands 15 to 35, the normal band highlighted, the value as a dot. */
function BmiScale({ bmi }: { bmi?: number }) {
  const first = BMI_SCALE[0];
  const span = BMI_SCALE[BMI_SCALE.length - 1] - first;
  const position = (value: number) => ((Math.min(Math.max(value, first), first + span) - first) / span) * 100;
  return (
    <div className="mt-4">
      <div className="relative flex h-2 gap-0.5">
        {BMI_SCALE.slice(1).map((edge, index) => (
          <i
            key={edge}
            aria-hidden
            className={`block rounded-full ${index === 1 ? "bg-glucose-in-range" : "bg-divider"}`}
            style={{ width: `${position(edge) - position(BMI_SCALE[index])}%` }}
          />
        ))}
        {bmi && (
          <i
            aria-hidden
            className="absolute top-1/2 block size-4 -translate-1/2 rounded-full border-[3px] border-panel bg-foreground"
            style={{ left: `${position(bmi)}%` }}
          />
        )}
      </div>
      <div className="relative mt-2 h-4 text-[11px] text-label">
        {BMI_SCALE.map((edge) => (
          <span key={edge} className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: `${position(edge)}%` }}>
            {formatNumber(edge, edge % 1 ? 1 : 0)}
          </span>
        ))}
      </div>
    </div>
  );
}
