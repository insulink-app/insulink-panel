import { differenceInCalendarDays, format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import type { TFunction } from "i18next";

/** The date-fns locale for the UI language. */
export function dateLocale(language: string) {
  return language.startsWith("de") ? de : enUS;
}

/**
 * A day as a heading or range says it: "Heute", "Gestern", the weekday with
 * its date within the week ("Mi., 07.10."), else the full date.
 */
export function formatDay(time: number, t: TFunction, language: string): string {
  const daysAgo = differenceInCalendarDays(new Date(), new Date(time));
  if (daysAgo === 0) {
    return t("common.today");
  }
  if (daysAgo === 1) {
    return t("common.yesterday");
  }
  if (daysAgo > 1 && daysAgo < 7) {
    return format(new Date(time), "EEE, dd.MM.", { locale: dateLocale(language) });
  }
  return format(new Date(time), "dd.MM.yyyy");
}

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
    return format(date, "EEE, HH:mm", { locale: dateLocale(language) });
  }
  return format(date, "dd.MM.yyyy, HH:mm");
}
