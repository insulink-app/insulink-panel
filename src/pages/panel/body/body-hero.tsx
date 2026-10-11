import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowDown, ArrowUp } from "@/components/icons";
import { formatNumber } from "@/lib/format";
import { formatDay } from "@/lib/when";
import type { Measurement } from "@/api/services/sport-service";
import type { MetricSpec } from "./series";

/**
 * The latest reading standing open on the page, like the Glukose and Puls
 * heroes: the value, then its change to the reading before and when it was taken.
 */
export function BodyHero({
  latest,
  previous,
  metric,
  unit,
}: {
  latest?: Measurement;
  previous?: Measurement;
  metric: MetricSpec;
  unit: string;
}) {
  const { t, i18n } = useTranslation();
  const change = latest && previous ? latest.value - previous.value : null;
  const Arrow = change != null && change < 0 ? ArrowDown : ArrowUp;
  return (
    <div className="flex items-center gap-3.5">
      <span className="whitespace-nowrap">
        <b className="text-[80px] leading-[0.9] font-extrabold tracking-[-0.045em]">
          {latest ? formatNumber(latest.value, metric.digits) : "–"}
        </b>
        <span className="text-[22px] font-bold text-muted-foreground"> {unit}</span>
      </span>
      {latest && (
        <span className="text-sm leading-[1.45] text-muted-foreground">
          {change != null && (
            <span className="flex items-center gap-1">
              <Arrow className="size-3.5 text-foreground" aria-hidden />
              <b className="text-foreground">
                {formatNumber(Math.abs(change), metric.digits)} {unit}
              </b>
              {t("body.to_previous")}
            </span>
          )}
          {formatDay(latest.time, t, i18n.language)}, {format(new Date(latest.time), "HH:mm")}
        </span>
      )}
    </div>
  );
}
