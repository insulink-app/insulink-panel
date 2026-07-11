import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import glucoseService from "@/api/services/glucose-service";
import sensorService from "@/api/services/sensor-service";
import settingsService from "@/api/services/settings-service";
import {
  classify,
  DEFAULT_TARGET_HIGH,
  DEFAULT_TARGET_LOW,
  statusColorVar,
  toDisplay,
  unitLabel,
} from "@/lib/glucose";

const statusLabel: Record<string, string> = {
  low: "Zu niedrig",
  "in-range": "Im Zielbereich",
  high: "Zu hoch",
};

function MiniStat({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-secondary/60 p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      <span className="text-2xl font-bold">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default function OverviewPage() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsService.find,
  });
  const { data: glucose, isLoading } = useQuery({
    queryKey: ["glucose-history"],
    queryFn: glucoseService.history,
  });
  const { data: sensor } = useQuery({
    queryKey: ["sensor-current"],
    queryFn: sensorService.current,
  });

  const unit = settings?.glucose_unit;
  const low = settings?.glucose_target_low ?? DEFAULT_TARGET_LOW;
  const high = settings?.glucose_target_high ?? DEFAULT_TARGET_HIGH;

  const entries = (glucose?.entries ?? [])
    .slice()
    .sort((a, b) => a.time - b.time);
  const latest = entries[entries.length - 1];
  const inRange = entries.filter(
    (e) => classify(e.value, low, high) === "in-range",
  ).length;
  const tir = entries.length
    ? Math.round((inRange / entries.length) * 100)
    : 0;

  const chartData = entries.slice(-288).map((e) => ({
    t: e.time * 1000, // seconds -> ms
    value: e.value,
  }));

  const sensorExpiry = sensor?.expires_at
    ? Math.max(
        0,
        Math.round((sensor.expires_at - Date.now()) / (1000 * 60 * 60)),
      )
    : undefined;

  return (
    <PanelPage title="Übersicht">
      <div className="py-6 flex flex-col gap-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-6 md:grid-cols-3 md:items-center">
            <div className="md:col-span-1 flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Aktueller Glukosewert
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-6xl font-bold leading-none"
                  style={
                    latest
                      ? { color: statusColorVar[classify(latest.value, low, high)] }
                      : undefined
                  }
                >
                  {latest ? toDisplay(latest.value, unit) : "–"}
                </span>
                <span className="text-lg text-muted-foreground">
                  {unitLabel(unit)}
                </span>
              </div>
              {latest && (
                <span
                  className="mt-1 w-fit rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{
                    backgroundColor:
                      statusColorVar[classify(latest.value, low, high)],
                  }}
                >
                  {statusLabel[classify(latest.value, low, high)]}
                </span>
              )}
              <span className="mt-1 text-xs text-muted-foreground">
                {latest
                  ? `zuletzt ${format(new Date(latest.time * 1000), "dd.MM. HH:mm")}`
                  : "keine Messungen"}
              </span>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <MiniStat
                title="Zeit im Ziel"
                value={`${tir} %`}
                hint={`${entries.length} Messungen`}
              />
              <MiniStat
                title="Zielbereich"
                value={`${low}–${high}`}
                hint="mg/dL"
              />
              <MiniStat
                title="Sensor"
                value={sensorExpiry != null ? `${sensorExpiry} h` : "–"}
                hint={sensor?.type ?? "kein aktiver Sensor"}
              />
              <MiniStat
                title="Ø heute"
                value={
                  entries.length
                    ? toDisplay(
                        entries.reduce((a, e) => a + e.value, 0) / entries.length,
                        unit,
                      )
                    : "–"
                }
                hint={unitLabel(unit)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verlauf</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Lädt…</p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Daten.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gluc" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--primary)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(t) => format(new Date(t), "HH:mm")}
                    fontSize={12}
                  />
                  <YAxis domain={["auto", "auto"]} fontSize={12} width={36} />
                  <Tooltip
                    labelFormatter={(t) =>
                      format(new Date(t as number), "dd.MM. HH:mm")
                    }
                    formatter={(v) => [
                      `${toDisplay(Number(v), unit)} ${unitLabel(unit)}`,
                      "Glukose",
                    ]}
                  />
                  <ReferenceLine
                    y={low}
                    stroke="var(--glucose-low)"
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    y={high}
                    stroke="var(--glucose-high)"
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="url(#gluc)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </PanelPage>
  );
}
