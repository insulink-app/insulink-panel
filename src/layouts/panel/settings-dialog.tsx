import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "next-themes";
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
  UserRound,
  SunMoon,
  MonitorCog,
  Moon,
  Sun,
  Languages,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import pkg from "@/../package.json";
import settingsService, {
  type UserSettings,
} from "@/api/services/settings-service";
import userService from "@/api/services/user-service";
import { useUserActions, useUserInformation } from "@/store/user-store";

// Each field mirrors an app setting (see profile_settings.dart / the *_state
// loaders). `def` is the app's default so the panel shows populated values even
// before the user ever synced from the app.
type Field =
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

// `id` is the stable, language-independent identity (used for nav state and the
// `initialCategory` prop); the display title is `settings.section_<id>`. Field
// `label`/`hint` hold translation keys, resolved with t() at render.
type Section = { id: string; icon: LucideIcon; fields: Field[] };

// Categories ↔ the app's ProfilePage topics. Order roughly follows the app.
const sections: Section[] = [
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

const APPEARANCE = "appearance";
const LANGUAGE = "language";
const ACCOUNT = "account";

export function SettingsDialog({
  open,
  onOpenChange,
  initialCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: string;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState(initialCategory ?? sections[0].id);
  // Adopt the requested category each time the dialog is (re)opened.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setActive(initialCategory ?? sections[0].id);
  }
  if (!open && wasOpen) setWasOpen(false);

  const section = sections.find((s) => s.id === active);

  // Resolve a category id to its display title.
  const titleFor = (id: string) =>
    id === ACCOUNT || id === APPEARANCE || id === LANGUAGE
      ? t(`settings.${id}`)
      : t(`settings.section_${id}`);

  const navItems = [
    ...sections.map((s) => ({ id: s.id, icon: s.icon })),
    { id: APPEARANCE, icon: SunMoon },
    { id: LANGUAGE, icon: Languages },
    { id: ACCOUNT, icon: UserRound },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[800px] p-0 gap-0 overflow-hidden">
        <div className="flex h-[520px] w-full">
          <div className="flex w-[210px] shrink-0 flex-col space-y-1 overflow-y-auto rounded-l-md bg-secondary/30 p-3">
            {navItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                title={titleFor(item.id)}
                isActive={active === item.id}
                onClick={() => setActive(item.id)}
              />
            ))}
            <div className="mt-auto pt-2 text-center text-xs text-muted-foreground">
              Version: {pkg.version}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <DialogHeader className="border-b-2 border-secondary">
              <DialogTitle className="pb-2">{titleFor(active)}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {active === ACCOUNT ? (
                <AccountPanel />
              ) : active === APPEARANCE ? (
                <AppearancePanel />
              ) : active === LANGUAGE ? (
                <LanguagePanel />
              ) : section ? (
                <SectionPanel section={section} />
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SidebarItem({
  icon: Icon,
  title,
  isActive,
  onClick,
}: {
  icon?: LucideIcon;
  title: string;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className="w-full justify-start"
      onClick={onClick}
    >
      {Icon && <Icon className="mr-2 size-4" />}
      <span>{title}</span>
    </Button>
  );
}

function SectionPanel({ section }: { section: Section }) {
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
    mutationFn: (s: UserSettings) => settingsService.change(s),
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
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="flex flex-col gap-4">
      {section.fields.map((field) => (
        <FieldRow
          key={field.key}
          field={field}
          value={form[field.key]}
          onChange={(v) => set(field.key, v)}
        />
      ))}
      <div className="pt-2">
        <Button
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending}
        >
          {t("common.save")}
          {mutation.isPending && <Spinner className="ml-2" />}
        </Button>
      </div>
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
  onChange: (v: unknown) => void;
}) {
  const { t } = useTranslation();
  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <Label>{t(field.label)}</Label>
          {field.hint && (
            <span className="text-xs text-muted-foreground">
              {t(field.hint)}
            </span>
          )}
        </div>
        <Switch
          checked={typeof value === "boolean" ? value : field.def}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  if (field.type === "select") {
    const current = value ?? field.def;
    const numeric = typeof field.def === "number";
    return (
      <div className="flex flex-col gap-2">
        <Label>{t(field.label)}</Label>
        <select
          className="border rounded-md h-9 px-2 bg-transparent w-48"
          value={String(current)}
          onChange={(e) =>
            onChange(numeric ? Number(e.target.value) : e.target.value)
          }
        >
          {field.options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label ?? t("settings.minutes", { n: Number(o.value) })}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{t(field.label)}</Label>
      <Input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value == null ? field.def : (value as number)}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
        className="w-48"
      />
    </div>
  );
}

// Device-local prefs (not part of the settings blob): theme via next-themes,
// language via i18next — same options as the dropdown selectors.
function AppearancePanel() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  return (
    <RadioGroup
      value={theme ?? "system"}
      onValueChange={setTheme}
      className="grid grid-cols-3 gap-4"
    >
      <OptionCard id="theme-system" value="system" selected={theme === "system"} icon={MonitorCog} label={t("panel.sidebar.theme.system")} />
      <OptionCard id="theme-light" value="light" selected={theme === "light"} icon={Sun} label={t("panel.sidebar.theme.light")} />
      <OptionCard id="theme-dark" value="dark" selected={theme === "dark"} icon={Moon} label={t("panel.sidebar.theme.dark")} />
    </RadioGroup>
  );
}

function LanguagePanel() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? "en_US";
  return (
    <RadioGroup
      value={language}
      onValueChange={i18n.changeLanguage}
      className="grid grid-cols-2 gap-4"
    >
      <OptionCard id="lang-en" value="en_US" selected={language === "en_US"} flag="🇺🇸" label="English" />
      <OptionCard id="lang-de" value="de_DE" selected={language === "de_DE"} flag="🇩🇪" label="Deutsch" />
    </RadioGroup>
  );
}

// A selectable card (PodDeck-style): big icon or flag over a label, ringed when
// selected. The RadioGroupItem is visually hidden — the whole card is the label.
function OptionCard({
  id,
  value,
  selected,
  label,
  icon: Icon,
  flag,
}: {
  id: string;
  value: string;
  selected: boolean;
  label: string;
  icon?: LucideIcon;
  flag?: string;
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition-all hover:border-primary",
        selected && "border-primary ring-2 ring-primary/30",
      )}
    >
      <RadioGroupItem value={value} id={id} className="sr-only" />
      {flag ? (
        <span className="text-5xl leading-none">{flag}</span>
      ) : (
        Icon && <Icon className="size-12" />
      )}
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </Label>
  );
}

function AccountPanel() {
  const { t } = useTranslation();
  const info = useUserInformation();
  const { setUserInformation } = useUserActions();

  const [name, setName] = useState(info?.name ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const nameMutation = useMutation({
    mutationFn: (n: string) => userService.changeName(n),
    onSuccess: (res) => {
      if (res.success) {
        setUserInformation({ name });
        toast.success(t("account.name_changed"));
      } else {
        toast.error(t("account.name_change_failed"));
      }
    },
    onError: () => toast.error(t("account.name_change_failed")),
  });

  const passwordMutation = useMutation({
    mutationFn: () => userService.changePassword(current, next),
    onSuccess: (res) => {
      if (res.success) {
        setCurrent("");
        setNext("");
        toast.success(t("account.password_changed"));
      } else {
        toast.error(t("account.password_change_failed"));
      }
    },
    onError: () => toast.error(t("account.password_change_failed")),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>{t("account.name")}</Label>
        <Input
          className="w-64"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          className="self-start"
          disabled={nameMutation.isPending || !name || name === info?.name}
          onClick={() => nameMutation.mutate(name)}
        >
          {t("common.save")}
          {nameMutation.isPending && <Spinner className="ml-2" />}
        </Button>
      </div>

      <div className="border-t" />

      <div className="flex flex-col gap-2">
        <Label>{t("account.current_password")}</Label>
        <Input
          type="password"
          className="w-64"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Label className="mt-2">{t("account.new_password")}</Label>
        <Input
          type="password"
          className="w-64"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Button
          className="self-start mt-2"
          disabled={passwordMutation.isPending || !current || !next}
          onClick={() => passwordMutation.mutate()}
        >
          {t("account.change_password")}
          {passwordMutation.isPending && <Spinner className="ml-2" />}
        </Button>
      </div>
    </div>
  );
}
