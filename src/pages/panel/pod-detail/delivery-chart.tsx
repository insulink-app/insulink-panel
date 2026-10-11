import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatNumber } from "@/lib/format";
import type { BolusDose } from "./delivery";

const TICKS = 4;

/**
 * Delivery over the pod's time: the basal as a step line over a light fill in
 * the accent, the boluses as teal bars labelled with their units.
 */
export function DeliveryChart({
  steps,
  doses,
  start,
  end,
  height = 220,
}: {
  steps: { time: number; rate: number }[];
  doses: BolusDose[];
  start: number;
  end: number;
  height?: number;
}) {
  const { t } = useTranslation();
  const span = Math.max(1, end - start);
  const x = (time: number) => ((time - start) / span) * 100;
  const top = Math.max(0.5, ...steps.map((step) => step.rate)) * 2.2;
  const level = (rate: number) => 100 - (rate / top) * 100;
  const line = steps.map((step, index) => `${index === 0 ? "M" : "H"}${x(step.time)}${index === 0 ? "," : " V"}${level(step.rate)}`).join(" ") + ` H100`;
  const biggest = Math.max(1, ...doses.map((dose) => dose.units));
  const insulin = t("nutrition.unit_insulin");
  return (
    <div>
      <div className="relative" style={{ height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          {steps.length > 0 && (
            <>
              <path d={`${line} V100 H${x(steps[0].time)} Z`} fill="var(--brand)" fillOpacity={0.14} />
              <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.4} vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        {doses.map((dose) => (
          <span
            key={dose.time}
            className="absolute bottom-0 flex w-3 -translate-x-1/2 flex-col items-center"
            style={{ left: `${x(dose.time)}%`, height: `${18 + (dose.units / biggest) * 62}%` }}
          >
            <b className="absolute -top-5 text-[11px] whitespace-nowrap">
              {formatNumber(dose.units, 1)} {insulin}
            </b>
            <i className="block size-full rounded-t-[5px] bg-teal" />
          </span>
        ))}
      </div>
      <div className="mt-2.5 flex justify-between text-[11px] text-label">
        {Array.from({ length: TICKS }, (_, index) => (
          <span key={index}>{format(new Date(start + (span * index) / (TICKS - 1)), span > 36 * 60 * 60 * 1000 ? "dd.MM. HH:mm" : "HH:mm")}</span>
        ))}
      </div>
    </div>
  );
}
