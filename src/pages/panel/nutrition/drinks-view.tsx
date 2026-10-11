import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CupSoda, Droplet, GlassWater, Milk } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { JumpToDate } from "@/components/scroll-pane";
import { TimelineList } from "@/components/timeline-list";
import { todayRows } from "../overview/today";
import { drinkKind } from "@/lib/nutrition";
import { formatNumber } from "@/lib/format";
import { formatDay } from "@/lib/when";
import type { Drink } from "@/api/services/nutrition-service";
import { dailyBuckets, topCounts } from "./daily";
import { TodayCard, WeekCard } from "./side-cards";

const DRINK_ICONS = {
  glass: GlassWater,
  small_bottle: CupSoda,
  sodastream: Milk,
  large_bottle: Milk,
  free: Droplet,
} as const;

/** The drinks as a timeline beside today's progress to the water goal and the week. */
export function DrinksView({ drinks, goal }: { drinks: Drink[]; goal?: number }) {
  const { t, i18n } = useTranslation();
  const [jumpTo, setJumpTo] = useState<number>();
  const sorted = drinks.slice().sort((left, right) => right.at - left.at);
  const today = todayRows(sorted, (drink) => drink.at);
  const total = today.reduce((sum, drink) => sum + drink.ml, 0);
  const kindLabel = (drink: Drink) => t("nutrition.kind_" + drinkKind(drink.kind));

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
      <Card className="gap-0 p-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="flex-1 text-lg font-extrabold">
            {t("nutrition.drinks")}
            <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(sorted.length)}</span>
          </h2>
          <JumpToDate onPick={setJumpTo} />
        </div>
        {sorted.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data_available")}</p>
        ) : (
          <TimelineList
            jumpTo={jumpTo}
            countLabel={(count) => t("nutrition.count_drinks", { count })}
            items={sorted.map((drink) => {
              const Icon = DRINK_ICONS[drinkKind(drink.kind) as keyof typeof DRINK_ICONS];
              return {
                key: String(drink.at),
                time: drink.at,
                color: "var(--water)",
                icon: <Icon />,
                title: kindLabel(drink),
                aside: (
                  <span className="whitespace-nowrap">
                    <b className="text-[15px] font-extrabold">{formatNumber(drink.ml)}</b>{" "}
                    <span className="text-xs text-muted-foreground">ml</span>
                  </span>
                ),
              };
            })}
          />
        )}
      </Card>
      <div className="flex min-w-0 flex-col gap-4">
        <TodayCard>
          <div className="mt-4 flex items-center gap-6">
            <GoalRing share={goal ? total / goal : 0} />
            <span className="min-w-0">
              <span className="block whitespace-nowrap">
                <b className="text-[28px] font-extrabold">{formatNumber(total)}</b>
                <span className="text-sm font-bold text-muted-foreground">
                  {goal ? ` / ${formatNumber(goal)} ml` : " ml"}
                </span>
              </span>
              {sorted[0] && (
                <span className="mt-1 block text-[13px] text-muted-foreground">
                  {t("nutrition.last_entry", { when: formatDay(sorted[0].at, t, i18n.language) })}
                </span>
              )}
            </span>
          </div>
        </TodayCard>
        <WeekCard
          className="flex-1"
          title={t("nutrition.drinks_week")}
          days={dailyBuckets(sorted, (drink) => drink.at, (drink) => drink.ml)}
          formatValue={(value) => `${formatNumber(value)} ml`}
          line={goal ? { value: goal, label: t("nutrition.water_goal", { value: formatNumber(goal) }) } : undefined}
          color="var(--water)"
          frequentTitle={t("nutrition.frequent_drinks")}
          frequent={topCounts(sorted.map((drink) => `${kindLabel(drink)} · ${formatNumber(drink.ml)} ml`))}
        />
      </div>
    </div>
  );
}

/** Progress towards the water goal as a ring with the percentage inside. */
function GoalRing({ share }: { share: number }) {
  const { t } = useTranslation();
  const percent = Math.round(share * 100);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  return (
    <span
      role="progressbar"
      aria-label={t("settings.water_goal")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, percent)}
      className="relative grid size-[112px] shrink-0 place-items-center"
    >
      <svg viewBox="0 0 112 112" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={56} cy={56} r={radius} fill="none" stroke="var(--ground)" strokeWidth={12} />
        <circle
          cx={56}
          cy={56}
          r={radius}
          fill="none"
          stroke="var(--water)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${circumference * Math.min(1, share)} ${circumference}`}
        />
      </svg>
      <b className="text-xl font-extrabold">{percent} %</b>
    </span>
  );
}
