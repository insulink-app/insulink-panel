import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, SkipForward } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/segmented";
import { TIME_RANGES, type TimeWindow } from "@/lib/use-time-window";
import { formatDay } from "@/lib/when";

export function TimeRangePicker({ window, className }: { window: TimeWindow; className?: string }) {
  const { t } = useTranslation();
  return (
    <Segmented
      label={t("overview.range")}
      value={window.rangeMs}
      onChange={window.setRangeMs}
      className={className}
      options={TIME_RANGES.map((range) => ({
        value: range.ms,
        label: range.days
          ? t("common.range_days", { n: range.days })
          : t("common.range_hours", { n: range.hours }),
      }))}
    />
  );
}

/** The span a window covers: "Heute · 03:54–09:54", or both ends with their day. */
function windowLabel(window: TimeWindow, t: TFunction, language: string) {
  const start = new Date(window.start);
  const end = new Date(window.end);
  if (isSameDay(start, end)) {
    return `${formatDay(window.start, t, language)} · ${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
  }
  return `${formatDay(window.start, t, language)} ${format(start, "HH:mm")} · ${formatDay(window.end, t, language)} ${format(end, "HH:mm")}`;
}

/**
 * A chart card's header: round older/newer buttons, the span shown, a jump
 * back to now, and the range selector at the right.
 */
export function TimeWindowBar({ window }: { window: TimeWindow }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="size-9 bg-ground"
          aria-label={t("common.older")}
          disabled={window.atEarliest}
          onClick={() => window.panBy(-window.rangeMs)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="size-9 bg-ground"
          aria-label={t("common.newer")}
          disabled={window.atLatest}
          onClick={() => window.panBy(window.rangeMs)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="mx-1.5 text-[13px] text-muted-foreground">{windowLabel(window, t, i18n.language)}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-9 border border-line bg-transparent px-3.5"
          disabled={window.atLatest}
          onClick={window.goLatest}
        >
          <SkipForward className="size-4" />
          {t("common.now_button")}
        </Button>
      </div>
      <TimeRangePicker window={window} />
    </div>
  );
}
