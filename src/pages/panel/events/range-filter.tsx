import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarClock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** The page's date filter: a calendar range behind a header button. */
export function RangeFilter({
  range,
  setRange,
}: {
  range: DateRange | undefined;
  setRange: (range: DateRange | undefined) => void;
}) {
  const { t } = useTranslation();
  const label =
    range?.from && range?.to
      ? `${format(range.from, "dd.MM.yyyy")}–${format(range.to, "dd.MM.yyyy")}`
      : range?.from
        ? format(range.from, "dd.MM.yyyy")
        : t("events.all_time");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="border border-line bg-panel hover:bg-raised">
          <CalendarClock className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-3xl p-0" align="end">
        <Calendar mode="range" numberOfMonths={2} defaultMonth={range?.from} selected={range} onSelect={setRange} autoFocus />
        {range && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setRange(undefined)}>
              {t("events.all_time")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
