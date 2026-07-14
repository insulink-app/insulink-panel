import { Fragment } from "react";
import { PLOT_BOTTOM, PLOT_TOP } from "@/lib/chart-geometry";

// A vertical gradient with hard stops at value thresholds, so a chart line
// takes its colour from the band it currently sits in instead of one flat
// stroke.
//
// It is deliberately `userSpaceOnUse`: the SVG default (`objectBoundingBox`)
// would measure the offsets against the bounding box of the painted curve,
// which is the data extent, not the axis domain — the thresholds would drift
// with the data. In user space the stops land on the axis, where they belong.
export interface ThresholdBand {
  color: string;
  /** The band's lower edge; omit on the last (lowest) band. */
  until?: number;
}

export function ThresholdGradient({
  id,
  yMin,
  yMax,
  bands,
}: {
  id: string;
  yMin: number;
  yMax: number;
  /** Highest band first. */
  bands: ThresholdBand[];
}) {
  const span = yMax - yMin || 1;
  // Stop offsets are fractions of y1..y2, which span exactly the plot area.
  const offsetOf = (value: number) =>
    Math.min(1, Math.max(0, (yMax - value) / span));

  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={0}
      y1={PLOT_TOP}
      x2={0}
      y2={PLOT_BOTTOM}
    >
      {bands.map((band, index) => {
        const previousEdge = bands[index - 1]?.until;
        const start = previousEdge === undefined ? 0 : offsetOf(previousEdge);
        const end = band.until === undefined ? 1 : offsetOf(band.until);
        return (
          <Fragment key={`${id}-${index}`}>
            <stop offset={start} stopColor={band.color} />
            <stop offset={end} stopColor={band.color} />
          </Fragment>
        );
      })}
    </linearGradient>
  );
}
