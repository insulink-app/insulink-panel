// The arrow beside a glucose reading, shared by every screen that shows one so
// "rising" never looks different from one page to the next.
import type { Icon } from "@phosphor-icons/react";
import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight } from "@/components/icons";
import { trendDirection, type TrendDirection } from "@/lib/glucose-trend";

const ARROWS: Record<TrendDirection, Icon> = {
  up: ArrowUp,
  up_right: ArrowUpRight,
  flat: ArrowRight,
  down_right: ArrowDownRight,
  down: ArrowDown,
};

export function GlucoseTrendArrow({
  perMin,
  color,
  size,
}: {
  perMin: number;
  color: string;
  size: number;
}) {
  const Arrow = ARROWS[trendDirection(perMin)];
  return <Arrow size={size} weight="bold" color={color} aria-hidden />;
}
