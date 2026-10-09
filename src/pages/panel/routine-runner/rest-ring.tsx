// The rest countdown as a ring that empties as the rest runs down. Past zero it
// turns red and counts the overtime up instead.
import { useEffect, useRef } from "react";
import { formatClock } from "./core";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RestRing(props: {
  remaining: number;
  overtime: number;
  expired: boolean;
  total: number;
  /** Epoch ms the rest runs out; the ring drains towards it on its own. */
  endsAt: number | null;
  paused: boolean;
}) {
  const arcRef = useDrainAnimation(props);
  const left = props.expired ? 1 : Math.min(1, props.remaining / Math.max(1, props.total));
  const color = props.expired ? "var(--destructive)" : "var(--brand)";
  return (
    <div className="relative mx-auto aspect-square w-64 max-w-full">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx={50} cy={50} r={RADIUS} fill="none" stroke="var(--divider)" strokeWidth={5} />
        <circle
          ref={arcRef}
          cx={50}
          cy={50}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - left)}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[64px] font-extrabold tracking-[-0.04em]"
        style={{ color }}
      >
        {props.expired ? `+${formatClock(props.overtime)}` : formatClock(props.remaining)}
      </span>
    </div>
  );
}

/**
 * Drains the arc in one animation from now to the rest's end, so it moves
 * every frame instead of restarting a one-second transition on each clock
 * tick (which stuttered whenever a tick came late). Paused, expired or with
 * reduced motion the arc just shows the ticked value.
 */
function useDrainAnimation(props: { expired: boolean; total: number; endsAt: number | null; paused: boolean }) {
  const arcRef = useRef<SVGCircleElement>(null);
  const { expired, total, endsAt, paused } = props;
  useEffect(() => {
    const arc = arcRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!arc || expired || paused || endsAt == null || reducedMotion) {
      return;
    }
    const leftMs = Math.max(0, endsAt - Date.now());
    const leftFraction = Math.min(1, leftMs / Math.max(1, total * 1000));
    const drain = arc.animate(
      [{ strokeDashoffset: CIRCUMFERENCE * (1 - leftFraction) }, { strokeDashoffset: CIRCUMFERENCE }],
      { duration: leftMs, easing: "linear", fill: "forwards" },
    );
    return () => drain.cancel();
  }, [expired, total, endsAt, paused]);
  return arcRef;
}
