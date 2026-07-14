import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";
import glucoseService from "@/api/services/glucose-service";
import nutritionService from "@/api/services/nutrition-service";
import settingsService from "@/api/services/settings-service";
import sportService from "@/api/services/sport-service";
import { DEFAULT_TARGET_HIGH, DEFAULT_TARGET_LOW } from "@/lib/glucose";
import { TimeInRangeCard } from "./glucose-cards";
import { GlucoseChart } from "./glucose-chart";
import { NutritionCard } from "./nutrition-card";
import { ActivityCard } from "./activity-card";

export default function OverviewPage() {
  const { t } = useTranslation();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const glucose = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
  });
  // The app defaults the horizon to 30 min and only offers 30/60.
  const horizon = settings?.prediction_horizon ?? 30;
  const prediction = useQuery({
    queryKey: ["glucose-prediction", horizon],
    queryFn: () => glucoseService.predict(horizon),
    enabled: settings?.prediction_enabled === true,
  });
  const meals = useQuery({ queryKey: ["meals"], queryFn: nutritionService.meals });
  const drinks = useQuery({ queryKey: ["drinks"], queryFn: nutritionService.drinks });
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: sportService.workouts });
  const trainings = useQuery({ queryKey: ["trainings"], queryFn: sportService.trainings });
  const routines = useQuery({ queryKey: ["routines"], queryFn: sportService.routines });
  const measurements = useQuery({
    queryKey: ["measurements"],
    queryFn: sportService.measurements,
  });

  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;

  const entries = useMemo(
    () =>
      (glucose.data?.entries ?? [])
        .slice()
        .sort((left, right) => left.time - right.time),
    [glucose.data],
  );

  return (
    <PanelPage title={t("overview.title")}>
      <div className="py-6 flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <GlucoseChart
            entries={entries}
            low={low}
            high={high}
            unit={unit}
            prediction={prediction.data}
            isLoading={glucose.isLoading}
          />
          <TimeInRangeCard
            entries={entries}
            low={low}
            high={high}
            unit={unit}
            isLoading={glucose.isLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <NutritionCard
            meals={meals.data?.meals ?? []}
            drinks={drinks.data?.drinks ?? []}
            isLoading={meals.isLoading || drinks.isLoading}
          />
          <ActivityCard
            workouts={workouts.data?.workouts ?? []}
            trainings={trainings.data?.trainings ?? []}
            routines={routines.data?.routines ?? []}
            measurements={measurements.data?.entries ?? []}
            isLoading={workouts.isLoading || trainings.isLoading}
          />
        </div>
      </div>
    </PanelPage>
  );
}
