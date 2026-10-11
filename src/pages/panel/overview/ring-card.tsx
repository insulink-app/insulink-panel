import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "@/components/icons";

const SIZE = 104;
const STROKE = 10;

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
  const lengths = parts.map((part) => circumference * Math.min(1, Math.max(0, part.share)));
  const starts = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, length) => sum + length, 0));
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
              strokeDashoffset={-starts[index]}
            />
          ) : null,
        )}
      </svg>
      <span className="relative text-center leading-tight">{children}</span>
    </span>
  );
}
