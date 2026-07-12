import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList, type ListColumn } from "@/components/data-list";
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
    () => (data?.entries ?? []).slice().sort((a, b) => b.time - a.time),
    [data],
  );

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const values = entries.map((e) => e.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const inRange = entries.filter(
      (e) => classify(e.value, low, high) === "in-range",
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
        cell: (e) => format(new Date(e.time * 1000), "dd.MM.yyyy HH:mm"),
      },
      {
        header: t("glucose.col_value"),
        cell: (e) => `${toDisplay(e.value, unit)} ${unitLabel(unit)}`,
      },
      {
        header: t("glucose.col_status"),
        cell: (e) => {
          const s = classify(e.value, low, high);
          return (
            <span style={{ color: statusColorVar[s] }}>{statusLabel[s]}</span>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unit, low, high, t],
  );

  return (
    <PanelPage title={t("glucose.title")}>
      <div className="py-6 flex flex-col gap-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Stat title={t("glucose.average")} value={fmt(stats?.avg, unit)} />
          <Stat title={t("glucose.minimum")} value={fmt(stats?.min, unit)} />
          <Stat title={t("glucose.maximum")} value={fmt(stats?.max, unit)} />
          <Stat title={t("glucose.in_range")} value={stats ? `${stats.tir} %` : "–"} />
        </div>
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

function fmt(v: number | undefined, unit?: string) {
  return v == null ? "–" : `${toDisplay(v, unit)} ${unitLabel(unit)}`;
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
