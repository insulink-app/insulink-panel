import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/table";
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

const statusLabel = { low: "Niedrig", "in-range": "Im Ziel", high: "Hoch" };

export default function GlucosePage() {
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

  const columns = useMemo<ColumnDef<GlucoseEntry, unknown>[]>(
    () => [
      {
        accessorKey: "time",
        header: "Zeitpunkt",
        cell: ({ row }) =>
          format(new Date(row.original.time * 1000), "dd.MM.yyyy HH:mm"),
      },
      {
        accessorKey: "value",
        header: "Wert",
        cell: ({ row }) =>
          `${toDisplay(row.original.value, unit)} ${unitLabel(unit)}`,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = classify(row.original.value, low, high);
          return (
            <span style={{ color: statusColorVar[s] }}>{statusLabel[s]}</span>
          );
        },
      },
    ],
    [unit, low, high],
  );

  return (
    <PanelPage title="Glukose">
      <div className="py-6 flex flex-col gap-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Stat title="Durchschnitt" value={fmt(stats?.avg, unit)} />
          <Stat title="Minimum" value={fmt(stats?.min, unit)} />
          <Stat title="Maximum" value={fmt(stats?.max, unit)} />
          <Stat
            title="Im Zielbereich"
            value={stats ? `${stats.tir} %` : "–"}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Messungen</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              name="glucose"
              columns={columns}
              data={entries}
              isLoading={isLoading}
              pageSize={25}
            />
          </CardContent>
        </Card>
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
