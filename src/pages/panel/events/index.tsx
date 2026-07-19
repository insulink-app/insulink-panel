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
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CHART_HEIGHT, CHART_MARGIN, X_AXIS_HEIGHT } from "@/lib/chart-geometry";
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
      <div className="py-6 flex flex-col gap-6">
        <RangeFilter range={range} setRange={setRange} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {totals.map((total) => (
            <CategoryTile
              key={total.category}
              category={total.category}
              count={total.count}
            />
          ))}
        </div>
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
        <Button variant="outline" className="self-end rounded-full font-normal">
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
function CategoryTile({
  category,
  count,
}: {
  category: EventCategory;
  count: number;
}) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICON[category];
  const color = `var(${CATEGORY_META[category].cssVar})`;
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-4"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
      }}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
      >
        <Icon className="size-5" style={{ color }} />
      </span>
      <div className="flex flex-col">
        <span className="text-2xl font-bold leading-tight" style={{ color }}>
          {count}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {t("events.category_" + category)}
        </span>
      </div>
    </div>
  );
}

function EventTypeCell({ entry }: { entry: EventEntry }) {
  const { t } = useTranslation();
  const category = categoryOf(entry.type);
  const Icon = CATEGORY_ICON[category];
  const color = `var(${CATEGORY_META[category].cssVar})`;
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex size-7 items-center justify-center rounded-full"
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
    <Card>
      <CardHeader>
        <CardTitle>{t("events.per_day")}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                fontSize={12}
                height={X_AXIS_HEIGHT}
              />
              <YAxis allowDecimals={false} fontSize={12} width={28} />
              <Tooltip
                content={<EventsTooltip colors={colors} />}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                isAnimationActive={false}
              />
              {EVENT_CATEGORIES.map((category) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="events"
                  fill={colors[category]}
                  radius={category === "sensor" ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
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
