import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { Segmented } from "@/components/segmented";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import { CHART_MARGIN_TIGHT, X_AXIS_STYLE } from "@/components/chart-kit";
import { CATEGORY_META, EVENT_CATEGORIES, type DailyEventCounts } from "@/lib/events";

/** The day span the chart and the lows-by-hour card look back over; 0 is all. */
export type SpanDays = 30 | 90 | 0;

/** Events per day as stacked bars, lows at the bottom. */
export function PerDayChart({
  data,
  span,
  onSpan,
}: {
  data: DailyEventCounts[];
  span: SpanDays;
  onSpan: (span: SpanDays) => void;
}) {
  const { t } = useTranslation();
  const colors = useMemo(() => resolveCategoryColors(), []);
  return (
    <Card className="mb-4 gap-0 p-6">
      <CardHeading
        title={t("events.per_day")}
        action={
          <Segmented
            label={t("overview.range")}
            value={span}
            onChange={onSpan}
            options={[
              { value: 30, label: t("common.range_days", { n: 30 }) },
              { value: 90, label: t("common.range_days", { n: 90 }) },
              { value: 0, label: t("events.range_all") },
            ]}
          />
        }
      />
      <div className="mt-6">
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={CHART_MARGIN_TIGHT} barCategoryGap="22%" maxBarSize={14}>
              <XAxis
                {...X_AXIS_STYLE}
                dataKey="day"
                tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                minTickGap={60}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                content={<EventsTooltip colors={colors} />}
                cursor={{ fill: "var(--raised)" }}
                isAnimationActive={false}
              />
              {EVENT_CATEGORIES.map((category, index) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="events"
                  fill={colors[category]}
                  radius={index === EVENT_CATEGORIES.length - 1 ? [4, 4, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function EventsTooltip({
  active,
  payload,
  label,
  colors,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  label?: number;
  colors: Record<string, string>;
}) {
  const { t } = useTranslation();
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <ChartTooltipBox caption={format(new Date(label as number), "dd.MM.yyyy")}>
      {payload
        .filter((row) => (row.value ?? 0) > 0)
        .map((row) => (
          <ChartTooltipValue key={row.name} color={colors[row.name as string]}>
            {t("events.category_" + row.name)}: {row.value}
          </ChartTooltipValue>
        ))}
    </ChartTooltipBox>
  );
}

// Bars take resolved colours: a stacked Recharts bar paints its fill as an SVG
// attribute, read once per mount from the theme tokens.
function resolveCategoryColors(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const resolved: Record<string, string> = {};
  for (const category of EVENT_CATEGORIES) {
    resolved[category] = style.getPropertyValue(CATEGORY_META[category].cssVar).trim() || "#888";
  }
  return resolved;
}
