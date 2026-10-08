import { differenceInCalendarDays, format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import type { TFunction } from "i18next";

/**
 * When something happened, the way a list row says it: "Today, 18:41",
 * "Yesterday, 17:25", a weekday within the week ("Tue, 16:21"), else the date.
 */
export function formatWhen(time: number, t: TFunction, language: string): string {
  const date = new Date(time);
  const clock = format(date, "HH:mm");
  const daysAgo = differenceInCalendarDays(new Date(), date);
  if (daysAgo === 0) {
    return t("common.today_at", { time: clock });
  }
  if (daysAgo === 1) {
    return t("common.yesterday_at", { time: clock });
  }
  if (daysAgo > 1 && daysAgo < 7) {
    return format(date, "EEE, HH:mm", { locale: language.startsWith("de") ? de : enUS });
  }
  return format(date, "dd.MM.yyyy, HH:mm");
}
