// Shared settings schema + field renderers; fast-refresh granularity doesn't
// apply to a helper module.
/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Droplet,
  Syringe,
  Ruler,
  Flag,
  Utensils,
  Bell,
  LineChart,
  BellOff,
  Code,
  type LucideIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import settingsService, {
  type UserSettings,
} from "@/api/services/settings-service";

// Each field mirrors an app setting (see profile_settings.dart / the *_state
// loaders). `def` is the app's default so the panel shows populated values even
// before the user ever synced from the app.
export type Field =
  | { type: "toggle"; key: string; label: string; hint?: string; def: boolean }
  | {
      type: "number";
      key: string;
      label: string;
      hint?: string;
      def: number;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      type: "select";
      key: string;
      label: string;
      hint?: string;
      def: string | number;
      options: { value: string | number; label?: string }[];
    };

// `id` is the stable, language-independent identity (used for nav state and
// routing); the display title is `settings.section_<id>`. Field `label`/`hint`
// hold translation keys, resolved with t() at render.
export type Section = { id: string; icon: LucideIcon; fields: Field[] };

// Categories ↔ the app's ProfilePage topics. Order roughly follows the app.
export const SETTINGS_SECTIONS: Section[] = [
  {
    id: "glucose",
    icon: Droplet,
    fields: [
      {
        type: "select",
        key: "glucose_unit",
        label: "settings.unit",
        def: "mgdl",
        options: [
          { value: "mgdl", label: "mg/dL" },
          { value: "mmol", label: "mmol/L" },
        ],
      },
      { type: "number", key: "glucose_target_low", label: "settings.target_range_low", def: 70, min: 40, max: 300, step: 5 },
      { type: "number", key: "glucose_target_high", label: "settings.target_range_high", def: 180, min: 40, max: 300, step: 5 },
      { type: "number", key: "glucose_urgent_low", label: "settings.urgent_low", def: 55, min: 40, max: 300, step: 5 },
      { type: "number", key: "glucose_low", label: "settings.low_alarm", def: 70, min: 40, max: 300, step: 5 },
      { type: "number", key: "glucose_high", label: "settings.high_alarm", def: 180, min: 40, max: 300, step: 5 },
      { type: "number", key: "glucose_urgent_high", label: "settings.urgent_high", def: 250, min: 40, max: 300, step: 5 },
    ],
  },
  {
    id: "bolus",
    icon: Syringe,
    fields: [
      { type: "number", key: "bolus_correction_factor", label: "settings.correction_factor", def: 35, min: 10, max: 100, step: 5 },
      { type: "number", key: "bolus_carb_factor", label: "settings.carb_factor", def: 15, min: 5, max: 30, step: 1 },
    ],
  },
  {
    id: "body",
    icon: Ruler,
    fields: [
      { type: "number", key: "sport.height_cm", label: "settings.height", def: 175, min: 100, max: 250, step: 1 },
      { type: "number", key: "sport.stride_cm", label: "settings.stride", def: 75, min: 40, max: 120, step: 1 },
    ],
  },
  {
    id: "activity_goals",
    icon: Flag,
    fields: [
      { type: "number", key: "sport.steps_goal", label: "settings.steps_goal", def: 10000, min: 0, step: 500 },
      { type: "number", key: "sport.distance_goal_m", label: "settings.distance_goal", def: 7000, min: 0, step: 500 },
      { type: "number", key: "sport.calories_goal", label: "settings.calories_goal", def: 500, min: 0, step: 50 },
      { type: "number", key: "sport.weight_goal_kg", label: "settings.weight_goal", def: 70, min: 0, step: 0.5 },
    ],
  },
  {
    id: "nutrition",
    icon: Utensils,
    fields: [
      { type: "number", key: "nutrition.water_goal_ml", label: "settings.water_goal", def: 2000, min: 0, step: 100 },
      { type: "number", key: "nutrition.carbs_goal_g", label: "settings.carbs_goal", def: 250, min: 0, step: 10 },
      { type: "number", key: "nutrition.protein_goal_g", label: "settings.protein_goal", def: 100, min: 0, step: 5 },
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    fields: [
      { type: "toggle", key: "notifications", label: "settings.notifications", def: true },
      { type: "toggle", key: "live_glucose_notification", label: "settings.live_glucose_notification", def: true },
      { type: "toggle", key: "connection_lost_alert", label: "settings.connection_lost_alert", def: true },
      { type: "toggle", key: "sensor_expiry_alert", label: "settings.sensor_expiry_alert", def: true },
      { type: "toggle", key: "sensor_halftime_alert", label: "settings.sensor_halftime_alert", def: true },
      { type: "toggle", key: "training_detected_alert", label: "settings.training_detected_alert", def: true },
      { type: "toggle", key: "predictive_advisory_alert", label: "settings.predictive_advisories", def: true },
      { type: "toggle", key: "alarm_sound", label: "settings.alarm_sound", def: true },
    ],
  },
  {
    id: "prediction",
    icon: LineChart,
    fields: [
      { type: "toggle", key: "prediction_enabled", label: "settings.prediction_enabled", def: false },
      {
        type: "select",
        key: "prediction_horizon",
        label: "settings.prediction_horizon",
        def: 30,
        options: [{ value: 30 }, { value: 60 }],
      },
    ],
  },
  {
    id: "silent_mode",
    icon: BellOff,
    fields: [
      { type: "toggle", key: "silent_mode", label: "settings.silent_mode", hint: "settings.silent_mode_hint", def: false },
    ],
  },
  {
    id: "developer",
    icon: Code,
    fields: [
      { type: "toggle", key: "developer", label: "settings.developer_mode", def: false },
    ],
  },
];

// The five topics the app exposes as full pages; the rest stay in the dialog.
export const PAGE_SECTION_IDS = ["glucose", "bolus", "body", "activity_goals", "nutrition"];

export const pageSections = () =>
  SETTINGS_SECTIONS.filter((section) => PAGE_SECTION_IDS.includes(section.id));

export const dialogSections = () =>
  SETTINGS_SECTIONS.filter((section) => !PAGE_SECTION_IDS.includes(section.id));

export function SectionPanel({ section }: { section: Section }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });

  // Keep the full blob so app-only keys (box layouts etc.) survive the
  // full-replace save. Reset local edits whenever fresh server data arrives.
  const [form, setForm] = useState<UserSettings>({});
  const [synced, setSynced] = useState<UserSettings>();
  if (data && data !== synced) {
    setSynced(data);
    setForm(data);
  }

  const mutation = useMutation({
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

  const set = (key: string, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));

  const Icon = section.icon;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{t("settings.section_" + section.id)}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.desc_" + section.id)}</p>
        </div>
      </div>

      <div className="divide-y rounded-2xl border bg-card">
        {section.fields.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            value={form[field.key]}
            onChange={(value) => set(field.key, value)}
          />
        ))}
      </div>

      <Button
        className="self-start"
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending}
      >
        {t("common.save")}
        {mutation.isPending && <Spinner className="ml-2" />}
      </Button>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { t } = useTranslation();

  const control = () => {
    if (field.type === "toggle") {
      return (
        <Switch
          checked={typeof value === "boolean" ? value : field.def}
          onCheckedChange={onChange}
        />
      );
    }

    if (field.type === "select") {
      const current = value ?? field.def;
      const numeric = typeof field.def === "number";
      return (
        <select
          className="h-9 w-40 rounded-md border bg-transparent px-2"
          value={String(current)}
          onChange={(event) =>
            onChange(numeric ? Number(event.target.value) : event.target.value)
          }
        >
          {field.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label ?? t("settings.minutes", { n: Number(option.value) })}
            </option>
          ))}
        </select>
      );
    }

    return (
      <Input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value == null ? field.def : (value as number)}
        onChange={(event) =>
          onChange(event.target.value === "" ? undefined : Number(event.target.value))
        }
        className="w-28 text-right"
      />
    );
  };

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex flex-col">
        <Label className="font-medium">{t(field.label)}</Label>
        {field.hint && (
          <span className="mt-0.5 text-xs text-muted-foreground">{t(field.hint)}</span>
        )}
      </div>
      <div className="shrink-0">{control()}</div>
    </div>
  );
}
