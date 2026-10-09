import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { dateLocale } from "@/lib/when";
import PanelPage from "@/layouts/panel";
import glucoseService from "@/api/services/glucose-service";
import nutritionService from "@/api/services/nutrition-service";
import settingsService from "@/api/services/settings-service";
import sportService from "@/api/services/sport-service";
import { DEFAULT_TARGET_HIGH, DEFAULT_TARGET_LOW } from "@/lib/glucose";
import { useUserInformation } from "@/store/user-store";
import { PageHeader } from "@/components/page-header";
import { TimeInRangeCard } from "./glucose-cards";
import { GlucoseCard } from "./glucose-card";
import { NutritionCard } from "./nutrition-card";
import { ActivityCard } from "./activity-card";

const GLUCOSE_POLL_MS = 60_000;

/** The greeting's key for the hour of the day. */
function greetingKey(hour: number) {
  if (hour < 12) {
    return "overview.greeting_morning";
  }
  return hour < 18 ? "overview.greeting_afternoon" : "overview.greeting_evening";
}

export default function OverviewPage() {
  const { t, i18n } = useTranslation();
  const name = useUserInformation()?.name ?? "";

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const glucose = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
    // The sensor writes about one reading a minute; polling faster only burns
    // requests. Paused while the tab is in the background (the TanStack default)
    // and refetched on focus, so a returning tab is current within a second.
    refetchInterval: GLUCOSE_POLL_MS,
  });
  // The app defaults the horizon to 30 min and only offers 30/60.
  const horizon = settings?.prediction_horizon ?? 30;
  const prediction = useQuery({
    queryKey: ["glucose-prediction", horizon],
    queryFn: () => glucoseService.predict(horizon),
    enabled: settings?.prediction_enabled === true,
    refetchInterval: GLUCOSE_POLL_MS,
  });
  const meals = useQuery({ queryKey: ["meals"], queryFn: nutritionService.meals });
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
      <PageHeader
        title={t(greetingKey(new Date().getHours()), { name })}
        subtitle={format(new Date(), "EEEE, d. MMMM", { locale: dateLocale(i18n.language) })}
      />
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
          <GlucoseCard
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
        <div className="grid gap-4 min-[1100px]:grid-cols-2">
          <NutritionCard
            meals={meals.data?.meals ?? []}
            isLoading={meals.isLoading}
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
