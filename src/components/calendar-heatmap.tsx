import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

// A Mon–Sun calendar grid, one cell per day, coloured by a caller-supplied
// value. Mirrors the app's analysis calendar heatmap; reused for daily
// time-in-range and daily event counts. `values` are keyed by local-midnight
// epoch ms (see `dailyTimeInRange`).
export function CalendarHeatmap({
  values,
  color,
  tooltip,
}: {
  values: Map<number, number>;
  // Cell background for a day's value; `undefined` value means the day is in the
  // span but has no data (rendered faint).
  color: (value: number | undefined) => string;
  // Hover text for a day that has data.
  tooltip: (value: number) => string;
}) {
  const { t } = useTranslation();

  const weeks = useMemo(() => buildWeeks(values), [values]);
  if (weeks.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {t("common.no_data")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7">
        {WEEKDAY_KEYS.map((key) => (
          <span
            key={key}
            className="text-center text-[11px] text-muted-foreground"
          >
            {t(key)}
          </span>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map((day, dayIndex) => (
            <DayCell
              key={dayIndex}
              day={day}
              value={day === null ? undefined : values.get(day)}
              color={color}
              tooltip={tooltip}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function DayCell({
  day,
  value,
  color,
  tooltip,
}: {
  day: number | null;
  value: number | undefined;
  color: (value: number | undefined) => string;
  tooltip: (value: number) => string;
}) {
  if (day === null) {
    return <div className="aspect-square" />;
  }
  return (
    <div
      className="flex aspect-square items-center justify-center rounded-md text-[11px] font-medium text-white/90"
      style={{ backgroundColor: color(value) }}
      title={value === undefined ? undefined : tooltip(value)}
    >
      {format(new Date(day), "d")}
    </div>
  );
}

const WEEKDAY_KEYS = [
  "date.weekday.mon",
  "date.weekday.tue",
  "date.weekday.wed",
  "date.weekday.thu",
  "date.weekday.fri",
  "date.weekday.sat",
  "date.weekday.sun",
];

// Mon-aligned weeks spanning the first to the last day that has data. Days
// outside that span render as null padding cells.
function buildWeeks(values: Map<number, number>): (number | null)[][] {
  const days = [...values.keys()].sort((left, right) => left - right);
  if (days.length === 0) {
    return [];
  }
  const first = new Date(days[0]);
  const last = new Date(days[days.length - 1]);
  const start = mondayOf(first);
  const weeks: (number | null)[][] = [];
  for (let cursor = start; cursor <= last.getTime(); cursor += WEEK_MS) {
    weeks.push(
      Array.from({ length: 7 }, (_unused, column) => {
        const day = cursor + column * DAY_MS;
        return day < days[0] || day > days[days.length - 1] ? null : day;
      }),
    );
  }
  return weeks;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Local midnight of the Monday on or before `date`.
function mondayOf(date: Date): number {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const backToMonday = (midnight.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0
  midnight.setDate(midnight.getDate() - backToMonday);
  return midnight.getTime();
}
