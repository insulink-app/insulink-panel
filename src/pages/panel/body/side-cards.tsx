import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowDown, ArrowUp } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { ScrollPane } from "@/components/scroll-pane";
import { useInfinitePaging } from "@/hooks/use-infinite-paging";
import { RangeStrip } from "@/components/range-history";
import { formatNumber } from "@/lib/format";
import { formatDay } from "@/lib/when";
import type { Measurement } from "@/api/services/sport-service";
import type { MetricSpec } from "./series";

/**
 * The readings, newest first, each placed on a strip spanning the period's
 * minimum to maximum, with the change to the reading before. The list scrolls
 * inside the card and loads older readings as its end comes near.
 */
export function LatestReadings({
  entries,
  metric,
  unit,
  className,
}: {
  entries: Measurement[];
  metric: MetricSpec;
  unit: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const paging = useInfinitePaging(entries.map((entry) => entry.time));
  return (
    <Card className={`gap-0 p-6 ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-3">
        <h2 className="flex-1 text-lg font-extrabold">
          {t("body.readings")}
          <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(entries.length)}</span>
        </h2>
        <span className="text-xs text-muted-foreground">{t("body.span_hint")}</span>
      </div>
      <ScrollPane onNearEnd={paging.loadMore} hasMore={paging.hasMore} loaded={paging.visible} minHeight={300}>
        <ReadingRows entries={entries} shown={paging.visible} metric={metric} unit={unit} />
      </ScrollPane>
    </Card>
  );
}

/** The first `shown` readings as divider rows; `entries` are newest first. */
function ReadingRows({
  entries,
  shown,
  metric,
  unit,
}: {
  entries: Measurement[];
  shown: number;
  metric: MetricSpec;
  unit: string;
}) {
  const { t, i18n } = useTranslation();
  const values = entries.map((entry) => entry.value);
  const domain: [number, number] = [Math.min(...values), Math.max(...values)];
  return (
    <div className="divide-y divide-divider">
      {entries.slice(0, shown).map((entry, index) => {
        const previous = entries[index + 1];
        const change = previous ? entry.value - previous.value : 0;
        return (
          <div key={entry.time} className="flex items-center gap-3.5 py-[11px]">
            <span className="min-w-0 flex-1">
              <b className="block text-sm">{formatDay(entry.time, t, i18n.language)}</b>
              <span className="text-xs text-muted-foreground">{format(new Date(entry.time), "HH:mm")}</span>
            </span>
            <span className="w-[90px] shrink-0">
              <RangeStrip value={entry.value} band={domain} domain={domain} color="var(--brand)" />
            </span>
            <span className="w-[110px] shrink-0 text-right whitespace-nowrap">
              <b className="block text-[15px]">
                {formatNumber(entry.value, metric.digits)} {unit}
              </b>
              {change !== 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  {change > 0 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
                  {formatNumber(Math.abs(change), metric.digits)}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
