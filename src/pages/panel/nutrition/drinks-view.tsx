import { useTranslation } from "react-i18next";
import { CupSoda, Droplet, GlassWater, Milk } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { TimelineList } from "@/components/timeline-list";
import { todayRows } from "../overview/today";
import { drinkKind } from "@/lib/nutrition";
import { formatNumber } from "@/lib/format";
import type { Drink } from "@/api/services/nutrition-service";
import { dailyBuckets } from "./daily";
import { TodayCard, WeekCard } from "./side-cards";

const DRINK_ICONS = {
  glass: GlassWater,
  small_bottle: CupSoda,
  sodastream: Milk,
  large_bottle: Milk,
  free: Droplet,
} as const;

/** The drinks as a day-grouped timeline beside today's amount and the week. */
export function DrinksView({ drinks, goal }: { drinks: Drink[]; goal?: number }) {
  const { t } = useTranslation();
  const sorted = drinks.slice().sort((left, right) => right.at - left.at);
  const today = todayRows(sorted, (drink) => drink.at);
  const total = today.reduce((sum, drink) => sum + drink.ml, 0);
  const share = goal ? Math.min(1, total / goal) : 0;

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
      <Card className="gap-0 p-6">
        <h2 className="mb-4 text-lg font-extrabold">
          {t("nutrition.drinks")}
          <span className="ml-2 text-[13px] font-bold text-muted-foreground">{formatNumber(sorted.length)}</span>
        </h2>
        {sorted.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data_available")}</p>
        ) : (
          <TimelineList
            countLabel={(count) => t("nutrition.count_drinks", { count })}
            olderLabel={t("nutrition.older_drinks")}
            items={sorted.map((drink) => {
              const kind = drinkKind(drink.kind);
              const Icon = DRINK_ICONS[kind as keyof typeof DRINK_ICONS];
              return {
                key: String(drink.at),
                time: drink.at,
                color: "var(--brand)",
                icon: <Icon />,
                title: t("nutrition.kind_" + kind),
                aside: <b className="text-sm">{formatNumber(drink.ml)} ml</b>,
              };
            })}
          />
        )}
      </Card>
      <div className="flex min-w-0 flex-col gap-4">
        <TodayCard
          figures={[
            { label: t("nutrition.amount"), value: formatNumber(total), unit: "ml" },
            { label: t("nutrition.drinks"), value: String(today.length) },
          ]}
        >
          {goal != null && goal > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-[13px]">
                <span className="text-muted-foreground">{t("nutrition.water_goal", { value: formatNumber(goal) })}</span>
                <b>{Math.round(share * 100)} %</b>
              </div>
              <div
                role="progressbar"
                aria-label={t("nutrition.water_goal", { value: formatNumber(goal) })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(share * 100)}
                className="h-2 overflow-hidden rounded bg-divider"
              >
                <i className="block h-full bg-primary" style={{ width: `${share * 100}%` }} />
              </div>
            </div>
          )}
        </TodayCard>
        <WeekCard
          className="flex-1"
          title={t("nutrition.drinks_week")}
          days={dailyBuckets(sorted, (drink) => drink.at, (drink) => drink.ml)}
          formatValue={(value) => `${formatNumber(value)} ml`}
        />
      </div>
    </div>
  );
}
