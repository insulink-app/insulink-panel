import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { subMonths } from "date-fns";
import PanelPage from "@/layouts/panel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { KpiStrip } from "@/components/kpi-strip";
import sportService, { type MeasurementType } from "@/api/services/sport-service";
import settingsService from "@/api/services/settings-service";
import { METRICS, keyFigureCells } from "./series";
import { BodyChart, BodyLegend } from "./body-chart";
import { BodyHero } from "./body-hero";
import { LatestReadings } from "./side-cards";

type Span = 3 | 6 | 12 | 0;

export default function BodyPage() {
  const { t } = useTranslation();
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
      <div className="mb-6 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <BodyHero latest={latest} previous={descending[1]} metric={metric} unit={unit} />
        <KpiStrip cells={keyFigureCells(ascending.map((entry) => entry.value), metric, unit, t)} />
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Card className="gap-0 p-6">
          <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <h2 className="flex-1 text-lg font-extrabold">{t("body.history")}</h2>
            {!metric.daily && <BodyLegend />}
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
        </Card>
        <LatestReadings entries={descending} metric={metric} unit={unit} />
      </div>
    </PanelPage>
  );
}
