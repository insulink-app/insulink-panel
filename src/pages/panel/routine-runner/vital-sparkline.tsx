import { useId } from "react";
import type { VitalPoint } from "./vital-history";

export interface SparkBand {
  color: string;
  /** The band's lower edge; omit on the last (lowest) band. */
  until?: number;
}

const WIDTH = 300;
const HEIGHT = 56;

// A continuous line over a fixed time window ending now, so a stretch without
// data keeps its real width and the right edge is always now. No axes and no
// fill. `limits` (target range, pulse zones) only keep the scale steady; with
// `bands` the line takes its colour from the band it runs through.
export function Sparkline({
  points,
  windowMs,
  limits,
  color,
  bands,
  emptyLabel,
}: {
  points: VitalPoint[];
  windowMs: number;
  limits: number[];
  color: string;
  bands?: SparkBand[];
  emptyLabel: string;
}) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  if (points.length < 2) {
    return <div className="flex h-14 items-center text-xs text-muted-foreground">{emptyLabel}</div>;
  }
  const end = Date.now();
  const start = end - windowMs;
  const values = [...points.map((point) => point.v), ...limits];
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  // A little headroom above and below, so the line never runs along the edge.
  const yOf = (value: number) => HEIGHT - 4 - ((value - min) / span) * (HEIGHT - 8);
  const coordinates = points.map(
    (point) => `${(((point.t - start) / windowMs) * WIDTH).toFixed(1)},${yOf(point.v).toFixed(1)}`,
  );
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="block h-14 w-full overflow-visible"
      aria-hidden
    >
      {bands && (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={0} y2={HEIGHT}>
            {bands.flatMap((band, index) => {
              const top = index === 0 ? 0 : yOf(bands[index - 1].until ?? min) / HEIGHT;
              const bottom = band.until === undefined ? 1 : yOf(band.until) / HEIGHT;
              const clampStop = (offset: number) => Math.min(1, Math.max(0, offset));
              return [
                <stop key={`${index}-top`} offset={clampStop(top)} stopColor={band.color} />,
                <stop key={`${index}-bottom`} offset={clampStop(bottom)} stopColor={band.color} />,
              ];
            })}
          </linearGradient>
        </defs>
      )}
      <polyline
        points={coordinates.join(" ")}
        fill="none"
        stroke={bands ? `url(#${gradientId})` : color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
