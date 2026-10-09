import { format } from "date-fns";

/**
 * An x label; the latest reading's reads "now", bold, in the text colour. The
 * first and last are anchored inward, so neither is cut at the plot edge.
 */
export function TimeTick({
  x,
  y,
  payload,
  index,
  visibleTicksCount,
  nowTime,
  nowLabel,
  tickFormat,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value: number };
  index?: number;
  visibleTicksCount?: number;
  nowTime?: number;
  nowLabel: string;
  tickFormat: string;
}) {
  if (!payload) {
    return null;
  }
  const isNow = nowTime != null && Math.abs(payload.value - nowTime) < 60_000;
  const isLast = index === (visibleTicksCount ?? 0) - 1;
  const anchor = index === 0 ? "start" : isLast ? "end" : "middle";
  return (
    <text
      x={Number(x)}
      y={Number(y) + 10}
      textAnchor={anchor}
      fontSize={12}
      fontWeight={isNow ? 700 : 400}
      fill={isNow ? "var(--text)" : "var(--text-muted)"}
    >
      {isNow ? nowLabel : format(new Date(payload.value), tickFormat)}
    </text>
  );
}
