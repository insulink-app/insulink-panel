import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ChevronRight } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { RangeStrip } from "@/components/range-history";
import { formatNumber } from "@/lib/format";
import { formatDay } from "@/lib/when";
import type { Measurement } from "@/api/services/sport-service";
import type { MetricSpec } from "./series";

/** Average, maximum (or total), minimum and count as a 2×2 grid. */
export function KeyFigures({ values, metric, unit }: { values: number[]; metric: MetricSpec; unit: string }) {
  const { t } = useTranslation();
  const sum = values.reduce((total, value) => total + value, 0);
  const show = (value: number) => (values.length ? formatNumber(value, metric.digits) : "–");
  const cells = [
    { label: t("body.average"), value: show(sum / Math.max(1, values.length)), unit },
    metric.daily
      ? { label: t("body.total"), value: show(sum), unit }
      : { label: t("body.maximum"), value: show(Math.max(...values)), unit },
    { label: t("body.minimum"), value: show(Math.min(...values)), unit },
    { label: t("body.entries"), value: formatNumber(values.length) },
  ];
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("body.key_figures")} />
      <div className="mt-4 grid grid-cols-2 gap-y-[18px]">
        {cells.map((cell, index) => (
          <div key={cell.label} className={index % 2 === 1 ? "border-l border-divider pl-[18px]" : ""}>
            <span className="text-[13px] text-muted-foreground">{cell.label}</span>
            <span className="mt-1 block">
              <b className="text-2xl font-extrabold">{cell.value}</b>
              {cell.unit && <span className="text-[13px] font-bold text-muted-foreground"> {cell.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

const PAGE = 6;

/**
 * The newest readings, each placed on a strip spanning the period's minimum to
 * maximum, with the change to the reading before.
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
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(PAGE);
  const values = entries.map((entry) => entry.value);
  const domain: [number, number] = [Math.min(...values), Math.max(...values)];
  return (
    <Card className={`gap-0 p-6 ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-3">
        <h2 className="flex-1 text-lg font-extrabold">
          {t("body.readings")}
          <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(entries.length)}</span>
        </h2>
        <span className="text-xs text-muted-foreground">{t("body.span_hint")}</span>
      </div>
      <div className="divide-y divide-divider">
        {entries.slice(0, visible).map((entry, index) => {
          const previous = entries[index + 1];
          const change = previous ? entry.value - previous.value : 0;
          return (
            <div key={entry.time} className="flex items-center gap-3.5 py-[11px]">
              <span className="min-w-0 flex-1">
                <b className="block text-sm">{formatDay(entry.time, t, i18n.language)}</b>
                <span className="text-xs text-muted-foreground">{format(new Date(entry.time), "HH:mm")}</span>
              </span>
              <span className="w-[90px]">
                <RangeStrip value={entry.value} band={domain} domain={domain} color="var(--brand)" />
              </span>
              <span className="w-[84px] text-right">
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
      {visible < entries.length && (
        <div className="mt-auto border-t border-divider pt-3.5 text-center">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE * 2)}
            className="inline-flex items-center gap-1 rounded-md text-[13px] font-bold text-brand-text hover:underline"
          >
            {t("body.all_readings")}
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
    </Card>
  );
}
