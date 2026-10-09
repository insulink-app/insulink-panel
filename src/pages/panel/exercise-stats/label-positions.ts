// Where the duration chart puts each routine's name at the end of its line.
import { CHART_MARGIN_TIGHT, X_AXIS_STYLE } from "@/components/chart-kit";
import type { RoutineSeries } from "./stats";

export const DURATION_CHART_HEIGHT = 230;

const PLOT_TOP = CHART_MARGIN_TIGHT.top;
const PLOT_HEIGHT = DURATION_CHART_HEIGHT - CHART_MARGIN_TIGHT.top - X_AXIS_STYLE.height;
const LABEL_GAP = 16;

/** The y-axis top: a little above the longest run. */
export function topOf(series: RoutineSeries[]) {
  return Math.max(1, ...series.flatMap((line) => line.points.map((point) => point.value))) + 5;
}

/**
 * Where each line's end label sits, in pixels: at its last point, pushed apart
 * so two lines ending close together keep readable labels.
 */
export function endLabelPositions(series: RoutineSeries[]): Map<string, number> {
  const top = topOf(series);
  const natural = series
    .map((line) => ({
      name: line.name,
      y: PLOT_TOP + (1 - line.points[line.points.length - 1].value / top) * PLOT_HEIGHT,
    }))
    .sort((upper, lower) => upper.y - lower.y);
  for (let index = 1; index < natural.length; index++) {
    natural[index].y = Math.max(natural[index].y, natural[index - 1].y + LABEL_GAP);
  }
  return new Map(natural.map((label) => [label.name, label.y]));
}
