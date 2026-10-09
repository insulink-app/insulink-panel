import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Utensils } from "@/components/icons";
import { ListRow } from "@/components/list-row";
import { ReferenceLine } from "recharts";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { PageHeader } from "@/components/page-header";
import { StatStrip } from "@/components/stat-strip";
import { GlucoseLineChart } from "@/components/glucose-line-chart";
import { formatNumber } from "@/lib/format";
import nutritionService, {
  type Meal,
  type MealEntry,
} from "@/api/services/nutrition-service";
import glucoseService, { type GlucoseEntry } from "@/api/services/glucose-service";
import settingsService from "@/api/services/settings-service";
import {
  classify,
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  statusColorVar,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";
import { formatAmount, withUnit } from "@/lib/nutrition";
import { formatWhen } from "@/lib/when";

// Glucose window around the meal: enough run-up to see the pre-meal level and
// enough tail to cover the rise it caused.
const BEFORE_MS = 60 * 60 * 1000;
const AFTER_MS = 3 * 60 * 60 * 1000;

export default function MealDetailPage() {
  const { t } = useTranslation();
  // Meals carry no id — their epoch-ms time is the key the list links by.
  const { time } = useParams();
  const mealTime = Number(time);

  const meals = useQuery({ queryKey: ["meals"], queryFn: nutritionService.meals });
  const meal = meals.data?.meals?.find((entry) => entry.time === mealTime);

  return (
    <PanelPage
      title={t("nutrition.meal_detail.title")}
      parents={[
        { title: t("nav.nutrition") },
        { title: t("nutrition.meals"), href: "/nutrition/meals" },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Button asChild variant="secondary" size="sm" className="self-start">
          <Link to="/nutrition/meals">
            <ArrowLeft className="size-4" />
            {t("nutrition.meal_detail.back")}
          </Link>
        </Button>

        {!meal ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {meals.isLoading ? t("common.loading") : t("common.no_data")}
          </p>
        ) : (
          <MealBody meal={meal} />
        )}
      </div>
    </PanelPage>
  );
}

function MealBody({ meal }: { meal: Meal }) {
  const { t, i18n } = useTranslation();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const glucose = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
  });

  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;
  const entries = meal.entries ?? [];
  const protein = entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0);

  return (
    <>
      <PageHeader
        title={
          <>
            {withUnit(meal.carbs, "g")}{" "}
            <span className="text-base font-bold text-muted-foreground">{t("nutrition.meal_detail.carbs")}</span>
          </>
        }
        subtitle={formatWhen(meal.time, t, i18n.language)}
      />

      <StatStrip
        cells={[
          {
            label: t("nutrition.meal_detail.glucose"),
            value: meal.glucose == null ? "–" : toDisplay(meal.glucose, unit),
            unit: meal.glucose == null ? undefined : unitLabel(unit),
            color: meal.glucose == null ? undefined : statusColorVar[classify(meal.glucose, low, high)],
          },
          {
            label: t("nutrition.meal_detail.bolus"),
            value: meal.bolus == null ? "–" : formatNumber(meal.bolus, 1),
            unit: meal.bolus == null ? undefined : t("nutrition.unit_insulin"),
          },
          { label: t("nutrition.meal_detail.protein"), value: entries.length === 0 ? "–" : withUnit(protein, "g") },
          { label: t("nutrition.meal_detail.products"), value: String(entries.length) },
        ]}
      />

      <MealGlucoseChart
        mealTime={meal.time}
        entries={glucose.data?.entries ?? []}
        low={low}
        high={high}
        unit={unit}
      />

      <Card className="gap-2 p-6">
        <CardHeading title={t("nutrition.meal_detail.products")} />
        <div className="divide-y divide-divider">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("nutrition.meal_detail.no_products")}
            </p>
          ) : (
            entries.map((entry, index) => (
              <EntryRow key={(entry.barcode || entry.name) + index} entry={entry} />
            ))
          )}
        </div>
      </Card>
    </>
  );
}

function EntryRow({ entry }: { entry: MealEntry }) {
  const { t } = useTranslation();
  const unit = entry.unit ?? "g";
  const servings = entry.serving && entry.serving > 0 ? entry.amount / entry.serving : null;
  // "2 servings · 60 g" when the product declares a serving size, else "60 g".
  const amount = withUnit(entry.amount, unit);
  const subtitle =
    servings == null
      ? amount
      : `${formatAmount(servings)} ${t(
          servings === 1
            ? "nutrition.meal_detail.serving_one"
            : "nutrition.meal_detail.servings",
        )} · ${amount}`;

  return (
    <ListRow icon={<Utensils />} title={entry.name} subtitle={subtitle} value={withUnit(entry.carbs, "g")} />
  );
}

// The glucose curve around the meal, with the meal itself marked — the whole
// point of a meal log: did this bolus cover these carbs?
function MealGlucoseChart({
  mealTime,
  entries,
  low,
  high,
  unit,
}: {
  mealTime: number;
  entries: GlucoseEntry[];
  low: number;
  high: number;
  unit?: string;
}) {
  const { t } = useTranslation();
  const from = mealTime - BEFORE_MS;
  const to = mealTime + AFTER_MS;

  const rows = useMemo(
    () =>
      entries
        .filter((entry) => entry.time >= from && entry.time <= to)
        .sort((left, right) => left.time - right.time)
        .map((entry) => ({ time: entry.time, value: entry.value })),
    [entries, from, to],
  );

  return (
    <Card className="gap-4 p-6">
      <CardHeading title={t("nutrition.meal_detail.chart_title")} />
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
      ) : (
        <GlucoseLineChart
          rows={rows}
          low={low}
          high={high}
          unit={unit}
          start={from}
          end={to}
          height={280}
          markers={
            <ReferenceLine
              x={mealTime}
              stroke="var(--brand)"
              strokeDasharray="4 4"
              label={{
                value: t("nutrition.meal_detail.meal_marker"),
                position: "insideTopLeft",
                fontSize: 11,
                fill: "var(--brand-text)",
              }}
            />
          }
        />
      )}
    </Card>
  );
}
