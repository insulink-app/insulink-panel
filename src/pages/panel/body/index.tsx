import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, subMonths } from "date-fns";
import PanelPage from "@/layouts/panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { StatusChip } from "@/components/status-chip";
import { formatNumber } from "@/lib/format";
import { formatDay } from "@/lib/when";
import sportService, { type MeasurementType } from "@/api/services/sport-service";
import settingsService from "@/api/services/settings-service";
import { METRICS } from "./series";
import { BodyChart } from "./body-chart";
import { KeyFigures, LatestReadings } from "./side-cards";

type Span = 3 | 6 | 12 | 0;

export default function BodyPage() {
  const { t, i18n } = useTranslation();
  const [metricType, setMetricType] = useState<MeasurementType>("WEIGHT");
  const [span, setSpan] = useState<Span>(0);
  const { data, isLoading } = useQuery({ queryKey: ["measurements"], queryFn: sportService.measurements });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsService.find });

  const metric = METRICS.find((entry) => entry.type === metricType) ?? METRICS[0];
  const unit = t(metric.unitKey);
  const ascending = useMemo(() => {
    const since = span === 0 ? 0 : subMonths(new Date(), span).getTime();
    return (data?.entries ?? [])
      .filter((entry) => entry.type === metricType && entry.time >= since)
      .sort((left, right) => left.time - right.time);
  }, [data, metricType, span]);
  const descending = useMemo(() => ascending.slice().reverse(), [ascending]);
  const latest = descending[0];
  const change = latest && descending[1] ? latest.value - descending[1].value : null;
  const goal = metricType === "WEIGHT" ? settings?.["sport.weight_goal_kg"] : undefined;

  return (
    <PanelPage title={t("body.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader
        title={t("body.title")}
        actions={
          <Segmented
            label={t("body.title")}
            value={metricType}
            onChange={setMetricType}
            className="border border-line"
            options={METRICS.map((entry) => ({ value: entry.type, label: t(entry.labelKey) }))}
          />
        }
      />
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Card className="gap-0 p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-sm text-muted-foreground">
                {t(metric.labelKey)}
                {latest && ` · ${formatDay(latest.time, t, i18n.language)}, ${format(new Date(latest.time), "HH:mm")}`}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-3.5">
                <span>
                  <b className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">
                    {latest ? formatNumber(latest.value, metric.digits) : "–"}
                  </b>
                  <span className="text-[22px] font-bold text-muted-foreground"> {unit}</span>
                </span>
                {change != null && (
                  <StatusChip color="var(--text-muted)">
                    {t("body.vs_previous", {
                      value: `${change >= 0 ? "+" : "−"}${formatNumber(Math.abs(change), metric.digits)} ${unit}`,
                    })}
                  </StatusChip>
                )}
              </div>
            </div>
            <Segmented
              label={t("overview.range")}
              value={span}
              onChange={setSpan}
              options={[
                { value: 3, label: t("body.span_months", { n: 3 }) },
                { value: 6, label: t("body.span_months", { n: 6 }) },
                { value: 12, label: t("body.span_year") },
                { value: 0, label: t("body.span_all") },
              ]}
            />
          </div>
          <div className="mt-6 flex flex-1 flex-col">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : ascending.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
            ) : (
              <BodyChart
                points={ascending.map((entry) => ({ t: entry.time, value: entry.value }))}
                metric={metric}
                unit={unit}
                goal={goal}
              />
            )}
          </div>
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <KeyFigures values={ascending.map((entry) => entry.value)} metric={metric} unit={unit} />
          <LatestReadings entries={descending} metric={metric} unit={unit} className="flex-1" />
        </div>
      </div>
    </PanelPage>
  );
}
