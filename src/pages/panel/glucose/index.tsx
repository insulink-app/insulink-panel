import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
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
import { useGlucoseHex } from "@/lib/use-glucose-hex";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Selectable graph spans. `hours`/`days` drive the localized label so no display
// string is concatenated from literals.
const RANGES = [
  { ms: 3 * HOUR, hours: 3 },
  { ms: 6 * HOUR, hours: 6 },
  { ms: 12 * HOUR, hours: 12 },
  { ms: DAY, hours: 24 },
  { ms: 3 * DAY, days: 3 },
  { ms: 7 * DAY, days: 7 },
];

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

  return (
    <PanelPage title={t("glucose.title")}>
      <div className="py-6 flex flex-col gap-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Stat title={t("glucose.average")} value={fmt(stats?.avg, unit)} />
          <Stat title={t("glucose.minimum")} value={fmt(stats?.min, unit)} />
          <Stat title={t("glucose.maximum")} value={fmt(stats?.max, unit)} />
          <Stat title={t("glucose.in_range")} value={stats ? `${stats.tir} %` : "–"} />
        </div>
        <GlucoseChart entries={entries} low={low} high={high} unit={unit} />
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
  const hex = useGlucoseHex();
  const [rangeMs, setRangeMs] = useState(6 * HOUR);
  // `null` anchor tracks the latest reading; a number pins the window end.
  const [anchorEnd, setAnchorEnd] = useState<number | null>(null);

  const latest = entries[0]?.time ?? Date.now();
  const earliest = entries[entries.length - 1]?.time ?? latest;
  const end = anchorEnd ?? latest;
  const start = end - rangeMs;

  const windowData = useMemo(
    () =>
      entries
        .filter((entry) => entry.time >= start && entry.time <= end)
        .map((entry) => ({ time: entry.time, value: entry.value }))
        .sort((left, right) => left.time - right.time),
    [entries, start, end],
  );

  const values = windowData.map((point) => point.value);
  const yMin = Math.min(low - 20, ...(values.length ? values : [low]));
  const yMax = Math.max(high + 20, ...(values.length ? values : [high]));

  const atLatest = anchorEnd == null || end >= latest;
  const atEarliest = start <= earliest;

  const panBy = (deltaMs: number) => {
    const proposed = (anchorEnd ?? latest) + deltaMs;
    // Snap back to live tracking once panned up to (or past) the latest reading.
    setAnchorEnd(proposed >= latest ? null : proposed);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle>{t("glucose.chart_title")}</CardTitle>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((range) => (
            <Button
              key={range.ms}
              size="sm"
              variant={rangeMs === range.ms ? "secondary" : "ghost"}
              onClick={() => setRangeMs(range.ms)}
            >
              {range.days
                ? t("glucose.range_days", { n: range.days })
                : t("glucose.range_hours", { n: range.hours })}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={atEarliest}
            onClick={() => panBy(-rangeMs)}
          >
            <ChevronLeft className="size-4" />
            {t("glucose.older")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {format(new Date(start), "dd.MM. HH:mm")} –{" "}
            {format(new Date(end), "dd.MM. HH:mm")}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={atLatest}
              onClick={() => panBy(rangeMs)}
            >
              {t("glucose.newer")}
              <ChevronRight className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={atLatest}
              onClick={() => setAnchorEnd(null)}
            >
              <SkipForward className="size-4" />
              {t("glucose.latest")}
            </Button>
          </div>
        </div>
        {windowData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={windowData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={[start, end]}
                tickFormatter={(value) =>
                  format(new Date(value), rangeMs > DAY ? "dd.MM." : "HH:mm")
                }
                fontSize={12}
              />
              <YAxis domain={[yMin, yMax]} fontSize={12} width={36} />
              <Tooltip
                content={<ChartTooltip unit={unit} />}
                cursor={{ stroke: "var(--border)" }}
                isAnimationActive={false}
              />
              <ReferenceArea
                y1={low}
                y2={high}
                fill={hex["in-range"]}
                fillOpacity={0.08}
              />
              <ReferenceLine y={low} stroke={hex.low} strokeOpacity={0.5} strokeDasharray="4 4" />
              <ReferenceLine y={high} stroke={hex.high} strokeOpacity={0.5} strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="value"
                stroke={hex["in-range"]}
                strokeWidth={2}
                fill={hex["in-range"]}
                fillOpacity={0.12}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <div className="text-xs text-muted-foreground">
        {format(new Date(label as number), "dd.MM. HH:mm")}
      </div>
      <div className="text-sm font-semibold text-popover-foreground">
        {toDisplay(Number(payload[0].value), unit)} {unitLabel(unit)}
      </div>
    </div>
  );
}

function fmt(value: number | undefined, unit?: string) {
  return value == null ? "–" : `${toDisplay(value, unit)} ${unitLabel(unit)}`;
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
