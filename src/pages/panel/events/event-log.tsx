import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, RefreshCw, WifiOff, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/segmented";
import { TimelineList } from "@/components/timeline-list";
import { RangeStrip } from "@/components/range-history";
import { formatNumber } from "@/lib/format";
import { CATEGORY_META, categoryOf, eventValue, type EventCategory } from "@/lib/events";
import { toDisplay, unitLabel } from "@/lib/glucose";
import type { EventEntry } from "@/api/services/event-service";

const CATEGORY_ICON: Record<EventCategory, LucideIcon> = {
  low: ArrowDown,
  high: ArrowUp,
  signal: WifiOff,
  sensor: RefreshCw,
  other: RefreshCw,
};

type Filter = "all" | "low" | "high" | "signal" | "sensor";

// The strip's span for a glucose event, in mg/dL.
const STRIP_DOMAIN: [number, number] = [40, 260];

/** Every event as a timeline grouped by day, filterable by type. */
export function EventLog({
  entries,
  low,
  high,
  unit,
}: {
  entries: EventEntry[];
  low: number;
  high: number;
  unit?: string;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? entries : entries.filter((entry) => categoryOf(entry.type) === filter);
  const filterLabel: Record<Filter, string> = {
    all: t("events.filter_all"),
    low: t("events.category_low"),
    high: t("events.category_high"),
    signal: t("events.filter_signal"),
    sensor: t("events.filter_sensor"),
  };

  return (
    <Card className="gap-0 p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-lg font-extrabold">
          {t("events.log")}
          <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(entries.length)}</span>
        </h2>
        <Segmented
          label={t("events.log")}
          value={filter}
          onChange={setFilter}
          options={(Object.keys(filterLabel) as Filter[]).map((value) => ({ value, label: filterLabel[value] }))}
        />
      </div>
      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("events.empty")}</p>
      ) : (
        <TimelineList
          countLabel={(count) => t("events.count", { count })}
          olderLabel={t("events.older")}
          items={shown.map((entry) => {
            const category = categoryOf(entry.type);
            const Icon = CATEGORY_ICON[category];
            const color = `var(${CATEGORY_META[category].cssVar})`;
            const value = eventValue(entry);
            const isGlucose = category === "low" || category === "high";
            return {
              key: `${entry.time}-${entry.type}`,
              time: entry.time,
              color,
              icon: <Icon strokeWidth={2.6} />,
              title: t("events.type_" + entry.type, t("events.category_" + category)),
              detail: isGlucose && value != null ? `${toDisplay(value, unit)} ${unitLabel(unit)}` : entry.data || undefined,
              aside:
                isGlucose && value != null ? (
                  <span className="hidden w-[120px] sm:block">
                    <RangeStrip value={value} band={[low, high]} domain={STRIP_DOMAIN} color={color} />
                  </span>
                ) : undefined,
            };
          })}
        />
      )}
    </Card>
  );
}
