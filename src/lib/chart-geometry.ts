// Geometry shared by the threshold charts (glucose, pulse). ThresholdGradient
// has to place its stops in user space, which means knowing where the plot area
// sits in pixels — so height, margin and axis height are pinned here rather than
// left to Recharts' defaults. A chart using the gradient must apply all three.
export const CHART_HEIGHT = 320;
export const CHART_MARGIN = { top: 8, right: 8, bottom: 8, left: 0 };
export const X_AXIS_HEIGHT = 30;
export const PLOT_TOP = CHART_MARGIN.top;
export const PLOT_BOTTOM = CHART_HEIGHT - CHART_MARGIN.bottom - X_AXIS_HEIGHT;
