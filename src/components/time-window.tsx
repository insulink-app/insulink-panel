import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, SkipForward } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/segmented";
import { TIME_RANGES, type TimeWindow } from "@/lib/use-time-window";

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

export function TimeWindowNav({ window }: { window: TimeWindow }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={window.atEarliest}
        onClick={() => window.panBy(-window.rangeMs)}
      >
        <ChevronLeft className="size-4" />
        {t("common.older")}
      </Button>
      <span className="text-xs text-muted-foreground">
        {format(new Date(window.start), "dd.MM. HH:mm")}–{format(new Date(window.end), "dd.MM. HH:mm")}
      </span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="secondary"
          disabled={window.atLatest}
          onClick={() => window.panBy(window.rangeMs)}
        >
          {t("common.newer")}
          <ChevronRight className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={window.atLatest}
          onClick={window.goLatest}
        >
          <SkipForward className="size-4" />
          {t("common.latest")}
        </Button>
      </div>
    </div>
  );
}
