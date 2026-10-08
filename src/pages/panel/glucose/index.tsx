import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import PanelPage from "@/layouts/panel";
import { Card } from "@/components/ui/card";
import { DataList, type ListColumn } from "@/components/data-list";
import { PageHeader } from "@/components/page-header";
import { CardHeading } from "@/components/card-heading";
import { StatStrip } from "@/components/stat-strip";
import { StatusChip } from "@/components/status-chip";
import { GlucoseLineChart } from "@/components/glucose-line-chart";
import { TimeRangePicker, TimeWindowNav } from "@/components/time-window";
import { DAY, useTimeWindow, useWindowedData } from "@/lib/use-time-window";
import glucoseService, {
  type GlucoseEntry,
} from "@/api/services/glucose-service";
import settingsService from "@/api/services/settings-service";
import {
  classify,
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  statusColorVar,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";

export default function GlucosePage() {
  const { t } = useTranslation();
  const statusLabel: Record<string, string> = {
    low: t("glucose.status_low"),
    "in-range": t("glucose.status_in_range"),
    high: t("glucose.status_high"),
  };
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
  });

  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;

  const entries = useMemo(
    () => (data?.entries ?? []).slice().sort((left, right) => right.time - left.time),
    [data],
  );

  const stats = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }
    const values = entries.map((entry) => entry.value);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const inRange = entries.filter(
      (entry) => classify(entry.value, low, high) === "in-range",
    ).length;
    return {
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      tir: Math.round((inRange / entries.length) * 100),
    };
  }, [entries, low, high]);

  const columns = useMemo<ListColumn<GlucoseEntry>[]>(
    () => [
      {
        header: t("glucose.col_time"),
        cell: (entry) => format(new Date(entry.time), "dd.MM.yyyy HH:mm"),
      },
      {
        header: t("glucose.col_value"),
        cell: (entry) => `${toDisplay(entry.value, unit)} ${unitLabel(unit)}`,
      },
      {
        header: t("glucose.col_status"),
        cell: (entry) => {
          const status = classify(entry.value, low, high);
          return (
            <span style={{ color: statusColorVar[status] }}>
              {statusLabel[status]}
            </span>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unit, low, high, t],
  );

  const latest = entries[0];
  return (
    <PanelPage title={t("glucose.title")}>
      <PageHeader title={t("glucose.title")} />
      <div className="flex flex-col gap-4">
        <div className="mb-2 flex flex-wrap items-end gap-x-3 gap-y-1">
          <b className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">
            {latest ? toDisplay(latest.value, unit) : "–"}
          </b>
          <span className="pb-1.5 text-sm text-muted-foreground">{unitLabel(unit)}</span>
          {latest && (
            <span className="ml-2 pb-1">
              <StatusChip color={statusColorVar[classify(latest.value, low, high)]}>
                {statusLabel[classify(latest.value, low, high)]}
              </StatusChip>
            </span>
          )}
        </div>
        <GlucoseChart entries={entries} low={low} high={high} unit={unit} />
        <StatStrip
          loading={isLoading}
          cells={[
            { label: t("glucose.minimum"), value: stats ? toDisplay(stats.min, unit) : "–", unit: unitLabel(unit) },
            { label: t("glucose.average"), value: stats ? toDisplay(stats.avg, unit) : "–", unit: unitLabel(unit) },
            { label: t("glucose.maximum"), value: stats ? toDisplay(stats.max, unit) : "–", unit: unitLabel(unit) },
            { label: t("glucose.in_range"), value: stats ? String(stats.tir) : "–", unit: "%" },
          ]}
        />
        <DataList
          title={t("glucose.readings")}
          columns={columns}
          data={entries}
          isLoading={isLoading}
          pageSize={25}
        />
      </div>
    </PanelPage>
  );
}

// Pannable, range-adjustable glucose graph. `entries` arrive newest-first.
function GlucoseChart({
  entries,
  low,
  high,
  unit,
}: {
  entries: GlucoseEntry[];
  low: number;
  high: number;
  unit?: string;
}) {
  const { t } = useTranslation();

  const ascending = useMemo(() => entries.slice().reverse(), [entries]);
  const latest = ascending[ascending.length - 1]?.time ?? Date.now();
  const earliest = ascending[0]?.time ?? latest;
  const window = useTimeWindow(latest, earliest);
  const windowData = useWindowedData(ascending, (entry) => entry.time, window);


  const rows = windowData.map((entry) => ({ time: entry.time, value: entry.value }));
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("glucose.chart_title")} action={<TimeRangePicker window={window} />} />
      <div className="mt-3">
        <TimeWindowNav window={window} />
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          <GlucoseLineChart
            rows={rows}
            low={low}
            high={high}
            unit={unit}
            start={window.start}
            end={window.end}
            nowTime={window.atLatest ? rows[rows.length - 1].time : undefined}
            height={300}
            tickFormat={window.rangeMs > DAY ? "dd.MM." : "HH:mm"}
          />
        )}
      </div>
    </Card>
  );
}
