import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { SleepSegment } from "@/api/services/health-service";
import { LANES, PHASE_COLOR, laneOf } from "./sleep";

const LANE = 34;
const BAR = 20;

/**
 * The night as four lanes, awake at the top and deep at the bottom. Each
 * segment is a rounded bar in its phase colour; thin vertical connectors join
 * one segment to the next, so the night reads as one continuous path.
 */
export function Hypnogram({ segments }: { segments: SleepSegment[] }) {
  const { t } = useTranslation();
  const ordered = segments.slice().sort((left, right) => left.a - right.a);
  const start = ordered[0].a;
  const end = Math.max(...ordered.map((segment) => segment.b));
  const span = Math.max(1, end - start);
  const x = (time: number) => ((time - start) / span) * 100;
  const center = (segment: SleepSegment) => LANES.indexOf(laneOf(segment)) * LANE + LANE / 2;
  const ticks = [start, ...[1, 2, 3].map((part) => start + (span * part) / 4), end];

  return (
    <div className="flex gap-3.5">
      <div className="w-[42px] shrink-0">
        {LANES.map((lane) => (
          <span key={lane} className="flex items-center text-xs text-muted-foreground" style={{ height: LANE }}>
            {t("sleep.stage_" + lane)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: LANES.length * LANE }} aria-hidden>
          {LANES.map((lane, index) => (
            <i key={lane} className="absolute inset-x-0 h-px bg-line" style={{ top: index * LANE + LANE / 2 }} />
          ))}
          {ordered.slice(1).map((segment, index) => {
            const from = center(ordered[index]);
            const to = center(segment);
            return (
              <i
                key={`link-${segment.a}`}
                className="absolute w-px bg-divider"
                style={{ left: `${x(segment.a)}%`, top: Math.min(from, to), height: Math.abs(to - from) }}
              />
            );
          })}
          {ordered.map((segment) => (
            <i
              key={segment.a}
              className="absolute block rounded-lg"
              style={{
                left: `${x(segment.a)}%`,
                width: `max(4px, ${x(segment.b) - x(segment.a)}%)`,
                top: center(segment) - BAR / 2,
                height: BAR,
                backgroundColor: PHASE_COLOR[laneOf(segment)],
              }}
            />
          ))}
        </div>
        <div className="mt-2.5 flex justify-between text-xs text-muted-foreground">
          {ticks.map((tick) => (
            <span key={tick}>{format(new Date(tick), "HH:mm")}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
