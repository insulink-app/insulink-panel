import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { endOfDay, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import PanelPage from "@/layouts/panel";
import { PageHeader } from "@/components/page-header";
import { KpiStrip } from "@/components/kpi-strip";
import eventService, { type EventEntry } from "@/api/services/event-service";
import settingsService from "@/api/services/settings-service";
import { CATEGORY_META, countByCategory, dailyEventCounts } from "@/lib/events";
import { DEFAULT_TARGET_HIGH, DEFAULT_TARGET_LOW } from "@/lib/glucose";
import { formatNumber } from "@/lib/format";
import { DAY } from "@/lib/use-time-window";
import { RangeFilter } from "./range-filter";
import { PerDayChart, type SpanDays } from "./per-day-chart";
import { EventLog } from "./event-log";
import { EventsSideCard } from "./side-card";

export default function EventsPage() {
  const { t } = useTranslation();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });
  const { data, isLoading } = useQuery({ queryKey: ["event-history"], queryFn: eventService.history });
  const [range, setRange] = useState<DateRange | undefined>();
  const [span, setSpan] = useState<SpanDays>(90);

  const entries = useMemo<EventEntry[]>(() => {
    const fromMs = range?.from ? startOfDay(range.from).getTime() : -Infinity;
    const toMs = range?.to ? endOfDay(range.to).getTime() : Infinity;
    return (data?.entries ?? [])
      .filter((entry) => entry.time >= fromMs && entry.time <= toMs)
      .sort((left, right) => right.time - left.time);
  }, [data, range]);
  const recent = useMemo(
    () => (span === 0 ? entries : entries.filter((entry) => entry.time >= Date.now() - span * DAY)),
    [entries, span],
  );
  const totals = countByCategory(entries);
  const period = span === 0 ? t("events.period_all") : t("events.period_days", { n: span });

  return (
    <PanelPage title={t("events.title")}>
      <PageHeader title={t("events.title")} actions={<RangeFilter range={range} setRange={setRange} />} />
      <div className="mb-6">
        <KpiStrip
          cells={totals.map((total) => ({
            label: t("events.category_" + total.category),
            value: isLoading ? "–" : formatNumber(total.count),
            dot: `var(${CATEGORY_META[total.category].cssVar})`,
          }))}
        />
      </div>
      <PerDayChart data={dailyEventCounts(recent)} span={span} onSpan={setSpan} />
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <EventLog
          entries={entries}
          low={settings?.glucose_target_low ?? DEFAULT_TARGET_LOW}
          high={settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH}
          unit={settings?.glucose_unit}
        />
        <EventsSideCard entries={recent} period={period} />
      </div>
    </PanelPage>
  );
}
