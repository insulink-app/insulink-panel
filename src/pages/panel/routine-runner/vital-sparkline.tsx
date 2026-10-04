import { useId } from "react";
import type { VitalPoint } from "./vital-history";

// A flat inline line over a fixed time window ending now, so a stretch without
// data keeps its real width instead of being squeezed out, and both tiles read
// the same way: the right edge is now. The `limits` (target range, pulse zones)
// are drawn dashed and always kept in view, so the line reads against them.
export function Sparkline({
  points,
  windowMs,
  limits,
  color,
  emptyLabel,
}: {
  points: VitalPoint[];
  windowMs: number;
  limits: number[];
  color: string;
  emptyLabel: string;
}) {
  const gradientId = useId();
  if (points.length < 2) {
    return (
      <div className="mt-3 flex h-20 items-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  const end = Date.now();
  const start = end - windowMs;
  const values = [...points.map((point) => point.v), ...limits];
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const width = 100;
  const height = 40;
  // A little headroom above and below, so the line never runs along the edge.
  const yOf = (value: number) => height - 4 - ((value - min) / span) * (height - 10);
  const coordinates = points.map(
    (point) => `${(((point.t - start) / windowMs) * width).toFixed(2)},${yOf(point.v).toFixed(2)}`,
  );
  const firstX = (((points[0].t - start) / windowMs) * width).toFixed(2);
  const lastX = (((points[points.length - 1].t - start) / windowMs) * width).toFixed(2);
  const area = `M${firstX},${height} L${coordinates.join(" L")} L${lastX},${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-3 h-20 w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {limits.map((limit) => (
        <line
          key={limit}
          x1={0}
          x2={width}
          y1={yOf(limit)}
          y2={yOf(limit)}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline
        points={coordinates.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
