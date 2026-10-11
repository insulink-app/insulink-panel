import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "@/components/icons";

const SIZE = 104;
const STROKE = 10;
/** Visible space between two parts of a split ring, in pixels. */
const GAP = 5;

export interface RingPart {
  /** Share of the ring, 0..1. */
  share: number;
  color: string;
}

/**
 * One of the overview's day cards: icon and label, a big value with a muted
 * suffix and one muted line on the left, and a ring with its centre text on
 * the right.
 */
export function RingCard({
  icon: Icon,
  label,
  value,
  suffix,
  line,
  parts,
  centre,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix: string;
  line: string;
  parts: RingPart[];
  centre: ReactNode;
}) {
  return (
    <Card className="flex-row items-center gap-5 p-6">
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Icon className="size-4 text-brand" aria-hidden />
          {label}
        </span>
        <p className="mt-2 whitespace-nowrap">
          <b className="text-[44px] leading-none font-extrabold tracking-tight">{value}</b>
          <span className="ml-1 text-base font-bold text-muted-foreground">{suffix}</span>
        </p>
        <p className="mt-3 truncate text-[13px] text-muted-foreground">{line}</p>
      </div>
      <Ring parts={parts}>{centre}</Ring>
    </Card>
  );
}

/** The ring: a ground-coloured track and the parts drawn one after another from the top. */
function Ring({ parts, children }: { parts: RingPart[]; children: ReactNode }) {
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const shares = parts.map((part) => circumference * Math.min(1, Math.max(0, part.share)));
  const starts = shares.map((_, index) => shares.slice(0, index).reduce((sum, length) => sum + length, 0));
  // Two or more parts get a clear gap between them; the round caps reach
  // half a stroke past each end, so the gap leaves room for both.
  const split = shares.filter((share) => share > 0).length > 1;
  const gap = split ? STROKE + GAP : 0;
  const lengths = shares.map((share) => (share > 0 ? Math.max(0.01, share - gap) : 0));
  return (
    <span className="relative grid size-[104px] shrink-0 place-items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={radius} fill="none" stroke="var(--ground)" strokeWidth={STROKE} />
        {parts.map((part, index) =>
          lengths[index] > 0 ? (
            <circle
              key={part.color}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              fill="none"
              stroke={part.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${lengths[index]} ${circumference}`}
              strokeDashoffset={-(starts[index] + gap / 2)}
            />
          ) : null,
        )}
      </svg>
      <span className="relative text-center leading-tight">{children}</span>
    </span>
  );
}
