import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { GlucoseLineChart } from "@/components/glucose-line-chart";
import { Segmented } from "@/components/segmented";
import { Stepper } from "@/components/stepper";
import glucoseService from "@/api/services/glucose-service";
import { summaryStats, toDisplay, unitLabel } from "@/lib/glucose";
import { formatNumber } from "@/lib/format";
import { SettingGroupLabel, SettingRow } from "./setting-row";
import type { SettingsFormApi } from "./use-settings-form";

const DAY = 24 * 60 * 60 * 1000;
const SCALE: [number, number] = [40, 300];

/** The thresholds in mg/dL, with the app's defaults. */
function thresholds(api: SettingsFormApi) {
  return {
    targetLow: api.number("glucose_target_low", 70),
    targetHigh: api.number("glucose_target_high", 180),
    urgentLow: api.number("glucose_urgent_low", 55),
    low: api.number("glucose_low", 70),
    high: api.number("glucose_high", 180),
    urgentHigh: api.number("glucose_urgent_high", 250),
  };
}

/** Unit, target range and the four alarm thresholds, all stored in mg/dL. */
export function GlucoseForm({ api }: { api: SettingsFormApi }) {
  const { t } = useTranslation();
  const values = thresholds(api);
  const glucoseStepper = (key: string, value: number, label: string) => (
    <Stepper
      value={value}
      onChange={(next) => api.set(key, next)}
      step={5}
      min={SCALE[0]}
      max={400}
      unit="mg/dL"
      label={label}
    />
  );
  const alarms = [
    { key: "glucose_urgent_low", value: values.urgentLow, label: t("settings.urgent_low"), dot: "var(--very-low)" },
    { key: "glucose_low", value: values.low, label: t("settings.low_alarm"), dot: "var(--low)" },
    { key: "glucose_high", value: values.high, label: t("settings.high_alarm"), dot: "var(--high)" },
    { key: "glucose_urgent_high", value: values.urgentHigh, label: t("settings.urgent_high"), dot: "var(--very-high)" },
  ];
  return (
    <>
      <SettingRow label={t("settings.unit")}>
        <Segmented
          label={t("settings.unit")}
          value={api.form.glucose_unit === "mmol" ? "mmol" : "mgdl"}
          onChange={(unit) => api.set("glucose_unit", unit)}
          options={[
            { value: "mgdl", label: "mg/dL" },
            { value: "mmol", label: "mmol/L" },
          ]}
        />
      </SettingRow>
      <SettingRow label={t("settings.target_range")}>
        <Stepper
          value={values.targetLow}
          onChange={(next) => api.set("glucose_target_low", next)}
          step={5}
          min={SCALE[0]}
          max={values.targetHigh - 5}
          label={t("settings.target_range")}
        />
        <span className="text-muted-foreground" aria-hidden>
          –
        </span>
        {glucoseStepper("glucose_target_high", values.targetHigh, t("settings.target_range"))}
      </SettingRow>
      <SettingGroupLabel>{t("settings.alarms")}</SettingGroupLabel>
      {alarms.map((alarm) => (
        <SettingRow key={alarm.key} label={alarm.label} dot={alarm.dot}>
          {glucoseStepper(alarm.key, alarm.value, alarm.label)}
        </SettingRow>
      ))}
    </>
  );
}

/** The chosen thresholds on a 40 to 300 scale, the last 24 h against the target band, and its time in range. */
export function GlucosePreview({ api }: { api: SettingsFormApi }) {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ["glucose-history"], queryFn: glucoseService.history });
  const values = thresholds(api);
  const unit = api.form.glucose_unit;
  const now = Date.now();
  const rows = (data?.entries ?? [])
    .filter((entry) => entry.time >= now - DAY)
    .sort((left, right) => left.time - right.time);
  const stats = summaryStats(
    rows.map((row) => row.value),
    values.targetLow,
    values.targetHigh,
  );
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("settings.preview")} />
      <ZoneScale values={values} unit={unit} />
      <div className="mt-6 flex min-h-[300px] flex-1 flex-col justify-center">
        {rows.length > 0 ? (
          <GlucoseLineChart
            rows={rows}
            low={values.targetLow}
            high={values.targetHigh}
            unit={unit}
            start={now - DAY}
            end={rows[rows.length - 1].time}
            nowTime={rows[rows.length - 1].time}
            height={300}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        )}
      </div>
      {stats && (
        <p className="mt-5 border-t border-divider pt-5 text-sm text-muted-foreground">
          <b className="mr-2 text-[28px] font-extrabold text-foreground">{formatNumber(stats.tir)} %</b>
          {t("settings.tir_24h")}
        </p>
      )}
    </Card>
  );
}

function ZoneScale({ values, unit }: { values: ReturnType<typeof thresholds>; unit?: string }) {
  const position = (mgdl: number) => ((Math.min(Math.max(mgdl, SCALE[0]), SCALE[1]) - SCALE[0]) / (SCALE[1] - SCALE[0])) * 100;
  const edges = [SCALE[0], values.urgentLow, values.targetLow, values.targetHigh, values.urgentHigh, SCALE[1]];
  const colors = ["var(--very-low)", "var(--low)", "var(--range)", "var(--high)", "var(--very-high)"];
  return (
    <div className="mt-5">
      <div className="relative h-7">
        {edges.slice(1, -1).map((edge) => (
          <span
            key={edge}
            className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center text-[13px] font-extrabold"
            style={{ left: `${position(edge)}%` }}
          >
            {toDisplay(edge, unit)}
            <i aria-hidden className="mt-0.5 block h-2 w-0.5 rounded bg-foreground" />
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex h-3 gap-0.5">
        {colors.map((color, index) => (
          <i
            key={color}
            aria-hidden
            className="block rounded-full"
            style={{ backgroundColor: color, width: `${position(edges[index + 1]) - position(edges[index])}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-label">
        <span>{toDisplay(SCALE[0], unit)}</span>
        <span>
          {toDisplay(SCALE[1], unit)} {unitLabel(unit)}
        </span>
      </div>
    </div>
  );
}
