// The one look every chart on the panel shares (spec section 4): no y-axis, few
// muted x labels, continuous 2.4 px lines without dots, rounded bars, and at
// most one "now" dot. Spread these into the Recharts elements.
export const AXIS_TICK = { fontSize: 12, fill: "var(--text-muted)" };

/** An x axis without line or ticks, labels only. */
export const X_AXIS_STYLE = {
  axisLine: false,
  tickLine: false,
  tick: AXIS_TICK,
  tickMargin: 8,
  height: 26,
} as const;

/** Horizontal gridlines across the full width, in the line colour. */
export const GRID_STYLE = { vertical: false, stroke: "var(--line)" } as const;

/** No left margin: the plot starts at the card's inner edge. */
export const CHART_MARGIN_TIGHT = { top: 12, right: 0, bottom: 0, left: 0 };

export const LINE_STYLE = {
  type: "monotone",
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  dot: false,
  activeDot: { r: 4, strokeWidth: 0 },
  isAnimationActive: false,
} as const;

export const BAR_STYLE = { radius: [5, 5, 0, 0] as [number, number, number, number], isAnimationActive: false };

/** Muted bars; the latest one is drawn in the brand colour. */
export const BAR_FILL = "color-mix(in srgb, var(--text-muted) 38%, transparent)";
export const BAR_FILL_CURRENT = "var(--brand)";

/** The single end-point dot for the "now" value. */
export const NOW_DOT = { r: 5.5, fill: "var(--text)", stroke: "var(--panel)", strokeWidth: 2.5 };

/** A threshold's number, small and muted, at the right edge above its line. */
export function thresholdLabel(value: string, below = false) {
  return {
    value,
    position: below ? "insideBottomRight" : "insideTopRight",
    fontSize: 11,
    fill: "var(--text-muted)",
  } as const;
}

/** `count` evenly spaced timestamps from `start` to `end`, both included. */
export function evenTicks(start: number, end: number, count = 5): number[] {
  if (end <= start) {
    return [start];
  }
  return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1));
}
