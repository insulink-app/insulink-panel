import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/stat-strip";
import { Flag } from "@/components/icons";
import type { Workout } from "@/api/services/sport-service";
import { formatDuration } from "./format";
import { effortRatioVsPrevious, previousWorkout, summarize } from "./workout-summary";

// End-of-workout headline: one overall training value — each exercise's change
// versus the previous session of the same routine, averaged so every exercise
// counts the same — as a big progress ring, with the concrete figures
// (exercises, sets, duration) small beneath it. Mirrors the app's
// WorkoutSummaryCard.
export function WorkoutSummaryCard({
  workout,
  allWorkouts,
}: {
  workout: Workout;
  allWorkouts: Workout[];
}) {
  const { t } = useTranslation();
  const current = summarize(workout);
  const previous = previousWorkout(allWorkouts, workout);
  const ratio = previous ? effortRatioVsPrevious(workout, previous) : null;
  const percent = ratio != null ? Math.round((ratio - 1) * 100) : null;

  // Brand for a gain, muted otherwise: green and red belong to glucose.
  const color = percent != null && percent > 0 ? "var(--brand)" : "var(--muted-foreground)";

  return (
    <Card className="items-center gap-6 p-6">
        <ProgressRing fraction={ratio ?? 1} color={ratio == null ? "var(--primary)" : color}>
          {percent == null ? (
            <div className="flex flex-col items-center gap-1">
              <Flag className="size-8" style={{ color: "var(--primary)" }} weight="fill" />
              <span className="w-24 text-center text-xs text-muted-foreground">
                {t("summary.first_time")}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-extrabold tabular-nums" style={{ color }}>
                {percent > 0 ? "+" : percent < 0 ? "−" : "±"}
                {Math.abs(percent)}%
              </span>
              <span className="text-xs text-muted-foreground">{t("summary.performance")}</span>
            </div>
          )}
        </ProgressRing>

        <div className="w-full">
          <StatStrip
            cells={[
              { label: t("summary.exercises"), value: String(current.exercises) },
              { label: t("routines.sets"), value: String(current.sets) },
              { label: t("activity.duration"), value: formatDuration(current.durationSecs) },
            ]}
          />
        </div>
    </Card>
  );
}

function ProgressRing({
  fraction,
  color,
  children,
}: {
  fraction: number;
  color: string;
  children: React.ReactNode;
}) {
  const size = 148;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--divider)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
