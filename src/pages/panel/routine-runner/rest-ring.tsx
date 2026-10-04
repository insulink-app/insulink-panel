// The rest countdown as a ring that empties as the rest runs down. Past zero it
// turns to the warning tone and counts the overtime up instead.
import { formatClock } from "./core";

export function RestRing(props: {
  remaining: number;
  overtime: number;
  expired: boolean;
  total: number;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const left = props.expired ? 1 : Math.min(1, props.remaining / Math.max(1, props.total));
  const color = props.expired ? "var(--glucose-low)" : "var(--primary)";
  return (
    <div className="relative mx-auto aspect-square w-64 max-w-full">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx={50} cy={50} r={radius} fill="none" stroke="var(--secondary)" strokeWidth={6} />
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - left)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-6xl font-bold tracking-tight tabular-nums"
        style={{ color }}
      >
        {props.expired ? `+${formatClock(props.overtime)}` : formatClock(props.remaining)}
      </span>
    </div>
  );
}
