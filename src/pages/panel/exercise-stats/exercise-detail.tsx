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
import { StatTooltip } from "./shared";
import { StatStrip } from "@/components/stat-strip";
import { CHART_MARGIN_TIGHT, GRID_STYLE, LINE_STYLE, X_AXIS_STYLE } from "@/components/chart-kit";

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
          <StatStrip
            cells={[
              { label: t("exercise_stats.total_sessions"), value: String(stat.sessions.length) },
              { label: t("exercise_stats.total_sets"), value: String(stat.totalSets) },
              { label: t("exercise_stats.best"), value: formatScore(stat.best, kind, t) },
            ]}
          />

          <div>
            <h3 className="mb-3 text-base font-extrabold">{t("exercise_stats.progression")}</h3>
            {chartData.length < 2 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("exercise_stats.not_enough_data")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={CHART_MARGIN_TIGHT}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis
                    {...X_AXIS_STYLE}
                    dataKey="t"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value) => format(new Date(value), "dd.MM.")}
                    minTickGap={32}
                  />
                  <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip
                    isAnimationActive={false}
                    cursor={{ stroke: "var(--divider)" }}
                    content={
                      <StatTooltip
                        formatLabel={(label) => format(new Date(label as number), "dd.MM.yyyy")}
                        formatValue={(value) => formatScore(value, kind, t)}
                      />
                    }
                  />
                  <Line {...LINE_STYLE} dataKey="value" stroke="var(--brand)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
