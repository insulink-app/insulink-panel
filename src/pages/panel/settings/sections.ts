import type { ComponentType } from "react";
import { Droplet, Flag, Ruler, Syringe, Utensils, WaveSine, type LucideIcon } from "@/components/icons";
import { BodyDerived, BodyForm } from "./body-tab";
import { BolusExample, BolusForm } from "./bolus-tab";
import { GlucoseForm, GlucosePreview } from "./glucose-tab";
import { NutritionGoalsForm, NutritionToday, SportGoalsForm, SportToday } from "./goals-tab";
import type { SettingsFormApi } from "./use-settings-form";

type Tab = ComponentType<{ api: SettingsFormApi }>;

/**
 * A settings tab: `id` is its stable route and key (shown via
 * `settings.section_<id>`). The basal tab has no `Form`: it renders its own
 * profile list and editor.
 */
export interface Section {
  id: string;
  icon: LucideIcon;
  Form?: Tab;
  Context?: Tab;
}

/** The tabs in the app's order; alert, prediction and developer settings stay app-only. */
export const SETTINGS_SECTIONS: Section[] = [
  { id: "glucose", icon: Droplet, Form: GlucoseForm, Context: GlucosePreview },
  { id: "bolus", icon: Syringe, Form: BolusForm, Context: BolusExample },
  { id: "basal", icon: WaveSine },
  { id: "body", icon: Ruler, Form: BodyForm, Context: BodyDerived },
  { id: "activity_goals", icon: Flag, Form: SportGoalsForm, Context: SportToday },
  { id: "nutrition", icon: Utensils, Form: NutritionGoalsForm, Context: NutritionToday },
];
