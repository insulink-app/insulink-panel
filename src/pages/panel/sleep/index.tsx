import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Moon } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { CardSkeleton } from "@/components/card-skeleton";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { PageHeader } from "@/components/page-header";
import { StatStrip } from "@/components/stat-strip";
import healthService, {
  type HealthDay,
  type SleepSegment,
} from "@/api/services/health-service";

// SleepStage enum order from the app: index → key. `tl` segments carry the index.
const STAGE_KEYS = ["deep", "rem", "light", "awake", "restless"] as const;
type StageKey = (typeof STAGE_KEYS)[number];

// The app's sleep tokens; awake takes its "low" colour, as in the app.
const STAGE_COLOR: Record<StageKey, string> = {
  deep: "var(--sleep-deep)",
  light: "var(--sleep-light)",
  rem: "var(--sleep-rem)",
  awake: "var(--low)",
  restless: "var(--sleep-restless)",
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
      <PageHeader title={t("sleep.title")} />
      <div className="flex flex-col gap-4">
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
              <Card className="gap-2 p-6">
                <CardHeading title={t("sleep.nights")} />
                <div className="divide-y divide-divider">
                  {nights.map((night) => {
                    const current = night.d === selected.d;
                    return (
                      <button
                        key={night.d}
                        type="button"
                        aria-pressed={current}
                        onClick={() => setSelectedKey(night.d)}
                        className="relative flex w-full items-center gap-3 py-3 pl-4 text-left transition-opacity hover:opacity-80"
                      >
                        {current && <i className="absolute top-3 bottom-3 left-0 block w-[3px] rounded-sm bg-primary" aria-hidden />}
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 text-brand">
                          <Moon size={17} />
                        </span>
                        <b className="flex-1 text-sm">{format(new Date(night.d), "EEE, dd.MM.yyyy")}</b>
                        <b className="text-sm">{formatSleep(night.sleep)}</b>
                      </button>
                    );
                  })}
                </div>
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

  const extras = [
    night.rhr != null && { label: t("sleep.resting_hr"), value: String(night.rhr), unit: t("sleep.bpm") },
    night.spo2 != null && { label: t("sleep.spo2"), value: String(night.spo2), unit: "%" },
    night.rr != null && { label: t("sleep.respiratory"), value: String(night.rr), unit: t("sleep.per_min") },
  ].filter((cell) => cell !== false);

  return (
    <>
      <div className="mb-2">
        <b className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">{formatSleep(night.sleep)}</b>
        <span className="mt-1 block text-sm text-muted-foreground">
          {t("sleep.total")} · {format(new Date(night.d), "EEEE, dd.MM.yyyy")}
        </span>
      </div>
      <StatStrip
        cells={(["deep", "rem", "light", "awake"] as StageKey[]).map((stage) => ({
          label: t("sleep.stage_" + stage),
          value: formatSleep(stageMinutes[stage]),
          color: STAGE_COLOR[stage],
        }))}
      />
      {night.tl && night.tl.length > 0 && (
        <Card className="gap-4 p-6">
          <CardHeading title={t("sleep.title")} />
          <Hypnogram segments={night.tl} />
        </Card>
      )}
      {extras.length > 0 && <StatStrip cells={extras} />}
    </>
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
                <rect x={0} y={laneY} width={1000} height={laneHeight} rx={6} fill="var(--ground)" />
                {segments
                  .filter((segment) => STAGE_KEYS[segment.s] === stage)
                  .map((segment, index) => (
                    <rect
                      key={index}
                      x={((segment.a - start) / span) * 1000}
                      y={laneY}
                      width={Math.max(1, ((segment.b - segment.a) / span) * 1000)}
                      height={laneHeight}
                      rx={6}
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
