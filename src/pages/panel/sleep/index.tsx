import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Moon } from "lucide-react";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import healthService, {
  type HealthDay,
  type SleepSegment,
} from "@/api/services/health-service";

// SleepStage enum order from the app: index → key. `tl` segments carry the index.
const STAGE_KEYS = ["deep", "rem", "light", "awake", "restless"] as const;
type StageKey = (typeof STAGE_KEYS)[number];

const STAGE_COLOR: Record<StageKey, string> = {
  deep: "#7C4DFF",
  light: "#4FC3F7",
  rem: "#1DE9B6",
  awake: "#EF5350",
  restless: "#F06292",
};

// Top-to-bottom lane order in the hypnogram: shallowest (awake) to deepest.
const LANE_ORDER: StageKey[] = ["awake", "restless", "rem", "light", "deep"];

export default function SleepPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["health-days"],
    queryFn: healthService.days,
  });

  // Only nights with recorded sleep, newest first.
  const nights = useMemo(
    () =>
      (data?.days ?? [])
        .filter((day) => day.sleep != null)
        .sort((left, right) => right.d.localeCompare(left.d)),
    [data],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = nights.find((night) => night.d === selectedKey) ?? nights[0];

  return (
    <PanelPage title={t("sleep.title")} parents={[{ title: t("nav.health") }]}>
      <div className="py-6 flex flex-col gap-6">
        {isLoading ? (
          <CardSkeleton />
        ) : !selected ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("common.no_data")}
          </p>
        ) : (
          <>
            <NightDetail night={selected} />
            {nights.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("sleep.nights")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {nights.map((night) => (
                    <button
                      key={night.d}
                      type="button"
                      onClick={() => setSelectedKey(night.d)}
                      className={
                        "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60" +
                        (night.d === selected.d ? " bg-secondary" : "")
                      }
                    >
                      <span className="flex items-center gap-2">
                        <Moon className="size-4 text-muted-foreground" />
                        {format(new Date(night.d), "EEE, dd.MM.yyyy")}
                      </span>
                      <span className="font-medium">{formatSleep(night.sleep)}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PanelPage>
  );
}

function NightDetail({ night }: { night: HealthDay }) {
  const { t } = useTranslation();
  const stageMinutes: Record<StageKey, number> = {
    deep: night.stages?.deep ?? 0,
    rem: night.stages?.rem ?? 0,
    light: night.stages?.light ?? 0,
    awake: night.stages?.awake ?? 0,
    restless: night.stages?.restless ?? 0,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{format(new Date(night.d), "EEEE, dd.MM.yyyy")}</CardTitle>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatSleep(night.sleep)}</div>
          <div className="text-xs text-muted-foreground">{t("sleep.total")}</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["deep", "rem", "light", "awake"] as StageKey[]).map((stage) => (
            <StageStat
              key={stage}
              color={STAGE_COLOR[stage]}
              label={t("sleep.stage_" + stage)}
              minutes={stageMinutes[stage]}
            />
          ))}
        </div>

        {night.tl && night.tl.length > 0 && <Hypnogram segments={night.tl} />}

        {(night.rhr != null || night.spo2 != null || night.rr != null) && (
          <div className="grid grid-cols-3 gap-3">
            {night.rhr != null && <StageStat label={t("sleep.resting_hr")} minutes={night.rhr} rawUnit={t("sleep.bpm")} />}
            {night.spo2 != null && <StageStat label={t("sleep.spo2")} minutes={night.spo2} rawUnit="%" />}
            {night.rr != null && <StageStat label={t("sleep.respiratory")} minutes={night.rr} rawUnit={t("sleep.per_min")} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Lane chart: one horizontal row per present stage (awake on top, deep at the
// bottom), each segment drawn as a coloured bar across the night's timeline.
function Hypnogram({ segments }: { segments: SleepSegment[] }) {
  const { t } = useTranslation();
  const start = Math.min(...segments.map((segment) => segment.a));
  const end = Math.max(...segments.map((segment) => segment.b));
  const span = Math.max(1, end - start);
  const present = LANE_ORDER.filter((stage) =>
    segments.some((segment) => STAGE_KEYS[segment.s] === stage),
  );
  const laneHeight = 26;
  const gap = 6;
  const height = present.length * (laneHeight + gap);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex">
        <div className="flex flex-col justify-between pr-2" style={{ height }}>
          {present.map((stage) => (
            <div key={stage} className="flex items-center" style={{ height: laneHeight }}>
              <span className="text-xs text-muted-foreground">{t("sleep.stage_" + stage)}</span>
            </div>
          ))}
        </div>
        <svg width="100%" height={height} className="flex-1" preserveAspectRatio="none" viewBox={`0 0 1000 ${height}`}>
          {present.map((stage, laneIndex) => {
            const laneY = laneIndex * (laneHeight + gap);
            return (
              <g key={stage}>
                <rect x={0} y={laneY} width={1000} height={laneHeight} rx={4} fill="var(--muted)" opacity={0.25} />
                {segments
                  .filter((segment) => STAGE_KEYS[segment.s] === stage)
                  .map((segment, index) => (
                    <rect
                      key={index}
                      x={((segment.a - start) / span) * 1000}
                      y={laneY}
                      width={Math.max(1, ((segment.b - segment.a) / span) * 1000)}
                      height={laneHeight}
                      rx={4}
                      fill={STAGE_COLOR[stage]}
                    />
                  ))}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{format(new Date(start), "HH:mm")}</span>
        <span>{format(new Date(end), "HH:mm")}</span>
      </div>
    </div>
  );
}

function StageStat({
  color,
  label,
  minutes,
  rawUnit,
}: {
  color?: string;
  label: string;
  minutes: number;
  rawUnit?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-secondary/50 p-4">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {color && <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />}
        {label}
      </span>
      <span className="text-lg font-bold">
        {rawUnit ? `${minutes} ${rawUnit}` : formatSleep(minutes)}
      </span>
    </div>
  );
}

// Minutes → "Xh Ym", or "–" when unknown (mirrors the app's formatSleepMinutes).
function formatSleep(minutes: number | undefined | null) {
  if (minutes == null) {
    return "–";
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest}m`;
  }
  return `${hours}h ${rest}m`;
}
