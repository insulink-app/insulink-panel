import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { endOfDay, format, startOfDay } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  RefreshCw,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CardHeading } from "@/components/card-heading";
import { StatStrip } from "@/components/stat-strip";
import { CHART_MARGIN_TIGHT, X_AXIS_STYLE } from "@/components/chart-kit";
import { DataList, type ListColumn } from "@/components/data-list";
import type { DateRange } from "react-day-picker";
import { CalendarClock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChartTooltipBox, ChartTooltipValue } from "@/components/chart-tooltip";
import eventService, { type EventEntry } from "@/api/services/event-service";
import settingsService from "@/api/services/settings-service";
import {
  CATEGORY_META,
  EVENT_CATEGORIES,
  categoryOf,
  countByCategory,
  dailyEventCounts,
  eventValue,
  type EventCategory,
} from "@/lib/events";
import { toDisplay, unitLabel } from "@/lib/glucose";

const CATEGORY_ICON: Record<EventCategory, LucideIcon> = {
  low: ArrowDown,
  high: ArrowUp,
  signal: WifiOff,
  sensor: RefreshCw,
  other: RefreshCw,
};

// The panel's mirror of the app's analysis "events" tab: a chronological log of
// notable events (glucose lows/highs, signal loss, sensor swap/stop), plus a
// per-day breakdown and category totals to visualise them.
export default function EventsPage() {
  const { t } = useTranslation();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["event-history"],
    queryFn: eventService.history,
  });

  const [range, setRange] = useState<DateRange | undefined>();

  const unit = settings?.glucose_unit;
  const entries = useMemo<EventEntry[]>(() => {
    const source: EventEntry[] = data?.entries ?? [];
    const fromMs = range?.from ? startOfDay(range.from).getTime() : -Infinity;
    const toMs = range?.to ? endOfDay(range.to).getTime() : Infinity;
    return source
      .filter((entry) => entry.time >= fromMs && entry.time <= toMs)
      .sort((left, right) => right.time - left.time);
  }, [data, range]);
  const totals = useMemo(() => countByCategory(entries), [entries]);
  const perDay = useMemo(() => dailyEventCounts(entries), [entries]);

  const columns = useMemo<ListColumn<EventEntry>[]>(
    () => [
      {
        header: t("events.col_type"),
        cell: (entry) => <EventTypeCell entry={entry} />,
      },
      {
        header: t("events.col_value"),
        cell: (entry) => {
          const value = eventValue(entry);
          return value == null ? "–" : `${toDisplay(value, unit)} ${unitLabel(unit)}`;
        },
      },
      {
        header: t("events.col_time"),
        className: "text-right",
        cell: (entry) => format(new Date(entry.time), "dd.MM.yyyy HH:mm"),
      },
    ],
    [unit, t],
  );

  return (
    <PanelPage title={t("events.title")}>
      <PageHeader title={t("events.title")} actions={<RangeFilter range={range} setRange={setRange} />} />
      <div className="flex flex-col gap-4">
        <StatStrip
          loading={isLoading}
          cells={totals.map((total) => ({
            label: t("events.category_" + total.category),
            value: String(total.count),
            color: total.category === "low" || total.category === "high"
              ? `var(${CATEGORY_META[total.category].cssVar})`
              : undefined,
          }))}
        />
        <EventsPerDayChart data={perDay} />
        <DataList
          title={t("events.log")}
          columns={columns}
          data={entries}
          isLoading={isLoading}
          pageSize={20}
          empty={t("events.empty")}
        />
      </div>
    </PanelPage>
  );
}

// The date-range filter: a pill button showing the active span (or a prompt)
// that opens a two-month range calendar, with a reset back to "all events".
function RangeFilter({
  range,
  setRange,
}: {
  range: DateRange | undefined;
  setRange: (range: DateRange | undefined) => void;
}) {
  const { t } = useTranslation();
  const label =
    range?.from && range?.to
      ? `${format(range.from, "dd.MM.yyyy")} – ${format(range.to, "dd.MM.yyyy")}`
      : range?.from
        ? format(range.from, "dd.MM.yyyy")
        : t("events.all_time");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="bg-panel hover:bg-raised">
          <CalendarClock className="size-4 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={range?.from}
          selected={range}
          onSelect={setRange}
          autoFocus
        />
        {range && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setRange(undefined)}
            >
              {t("events.all_time")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// A summary tile per category: the category's icon in a tinted circle, its
// count, and label. Mirrors the log's row styling so the page reads as one set.
function EventTypeCell({ entry }: { entry: EventEntry }) {
  const { t } = useTranslation();
  const category = categoryOf(entry.type);
  const Icon = CATEGORY_ICON[category];
  const color = `var(${CATEGORY_META[category].cssVar})`;
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
      >
        <Icon className="size-4" style={{ color }} />
      </span>
      {t("events.type_" + entry.type, t("events.category_" + category))}
    </span>
  );
}

// Stacked bars, one column per day that has events, split by category. Days
// with no events are simply absent (events are rare, so a dense axis would be
// mostly empty).
function EventsPerDayChart({ data }: { data: ReturnType<typeof dailyEventCounts> }) {
  const { t } = useTranslation();
  // ponytail: resolved once at mount — a theme toggle restains only on the next
  // render. Fine for a rarely-open chart; wrap in a MutationObserver hook if it
  // ever needs to be live.
  const colors = useMemo(() => resolveCategoryColors(), []);

  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("events.per_day")} />
      <div className="mt-4">
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={CHART_MARGIN_TIGHT}>
              <XAxis
                {...X_AXIS_STYLE}
                dataKey="day"
                tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                minTickGap={24}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                content={<EventsTooltip colors={colors} />}
                cursor={{ fill: "var(--raised)" }}
                isAnimationActive={false}
              />
              {EVENT_CATEGORIES.map((category) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="events"
                  fill={colors[category]}
                  radius={category === "sensor" ? [5, 5, 0, 0] : 0}
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

// The category colours resolved from their CSS vars to hex, for the SVG bar
// fills (a `var()` string is not valid in an SVG presentation attribute).
function resolveCategoryColors(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  const resolved: Record<string, string> = {};
  for (const category of EVENT_CATEGORIES) {
    resolved[category] =
      style.getPropertyValue(CATEGORY_META[category].cssVar).trim() || "#888";
  }
  return resolved;
}
