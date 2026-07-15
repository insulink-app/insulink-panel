import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
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
import { useGlucoseHex } from "@/lib/use-glucose-hex";
import { formatAmount, withUnit } from "@/lib/nutrition";

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
      <div className="py-6 flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
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
  const { t } = useTranslation();
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">
            {withUnit(meal.carbs, "g")}{" "}
            <span className="text-base font-semibold text-muted-foreground">
              {t("nutrition.meal_detail.carbs")}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(meal.time), "EEEE, dd.MM.yyyy HH:mm")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={t("nutrition.meal_detail.glucose")}
          value={
            meal.glucose == null
              ? "–"
              : `${toDisplay(meal.glucose, unit)} ${unitLabel(unit)}`
          }
          color={
            meal.glucose == null
              ? undefined
              : statusColorVar[classify(meal.glucose, low, high)]
          }
        />
        <StatTile
          label={t("nutrition.meal_detail.bolus")}
          value={
            meal.bolus == null
              ? "–"
              : `${meal.bolus.toFixed(1)} ${t("nutrition.unit_insulin")}`
          }
        />
        <StatTile
          label={t("nutrition.meal_detail.protein")}
          value={entries.length === 0 ? "–" : withUnit(protein, "g")}
        />
        <StatTile
          label={t("nutrition.meal_detail.products")}
          value={String(entries.length)}
        />
      </div>

      <MealGlucoseChart
        mealTime={meal.time}
        entries={glucose.data?.entries ?? []}
        low={low}
        high={high}
        unit={unit}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("nutrition.meal_detail.products")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("nutrition.meal_detail.no_products")}
            </p>
          ) : (
            entries.map((entry, index) => (
              <EntryRow key={(entry.barcode || entry.name) + index} entry={entry} />
            ))
          )}
        </CardContent>
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
    <div className="flex items-center gap-3 rounded-xl bg-secondary/40 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{entry.name}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <span className="font-semibold tabular-nums">{withUnit(entry.carbs, "g")}</span>
    </div>
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
  const hex = useGlucoseHex();
  const from = mealTime - BEFORE_MS;
  const to = mealTime + AFTER_MS;

  const data = useMemo(
    () =>
      entries
        .filter((entry) => entry.time >= from && entry.time <= to)
        .sort((left, right) => left.time - right.time),
    [entries, from, to],
  );

  const values = data.map((entry) => entry.value);
  const yMin = Math.min(low - 20, ...(values.length ? values : [low]));
  const yMax = Math.max(high + 20, ...(values.length ? values : [high]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("nutrition.meal_detail.chart_title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={[from, to]}
                tickFormatter={(value) => format(new Date(value), "HH:mm")}
                fontSize={12}
              />
              <YAxis domain={[yMin, yMax]} fontSize={12} width={36} />
              <Tooltip
                content={<ChartTooltip unit={unit} />}
                cursor={{ stroke: "var(--border)" }}
                isAnimationActive={false}
              />
              <ReferenceArea y1={low} y2={high} fill={hex["in-range"]} fillOpacity={0.08} />
              <ReferenceLine y={low} stroke={hex.low} strokeOpacity={0.5} strokeDasharray="4 4" />
              <ReferenceLine y={high} stroke={hex.high} strokeOpacity={0.5} strokeDasharray="4 4" />
              <ReferenceLine
                x={mealTime}
                stroke="var(--primary)"
                strokeWidth={2}
                label={{
                  value: t("nutrition.meal_detail.meal_marker"),
                  position: "insideTopLeft",
                  fontSize: 11,
                  fill: "var(--primary)",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={hex["in-range"]}
                strokeWidth={2}
                fill={hex["in-range"]}
                fillOpacity={0.12}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: number;
  unit?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <ChartTooltipBox caption={format(new Date(label as number), "dd.MM. HH:mm")}>
      <ChartTooltipValue>
        {toDisplay(Number(payload[0].value), unit)} {unitLabel(unit)}
      </ChartTooltipValue>
    </ChartTooltipBox>
  );
}
