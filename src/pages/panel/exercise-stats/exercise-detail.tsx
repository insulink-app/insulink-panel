// Per-exercise progression: the best-set score over time, so a plateau or a
// steady climb is visible at a glance.
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatScore, type ExerciseStat } from "./stats";
import { StatTooltip, SummaryTile } from "./shared";

export function ExerciseDetail({ stat, onClose }: { stat: ExerciseStat; onClose: () => void }) {
  const { t } = useTranslation();
  const kind = stat.exercise.kind;
  const chartData = stat.sessions.map((session) => ({ t: session.time, value: session.best }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{stat.exercise.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile label={t("exercise_stats.total_sessions")} value={stat.sessions.length} />
            <SummaryTile label={t("exercise_stats.total_sets")} value={stat.totalSets} />
            <SummaryTile label={t("exercise_stats.best")} value={formatScore(stat.best, kind, t)} />
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("exercise_stats.progression")}
            </span>
            {chartData.length < 2 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("exercise_stats.not_enough_data")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} width={44} domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip
                    isAnimationActive={false}
                    cursor={{ stroke: "var(--border)" }}
                    content={
                      <StatTooltip
                        formatLabel={(label) => format(new Date(label as number), "dd.MM.yyyy")}
                        formatValue={(value) => formatScore(value, kind, t)}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
