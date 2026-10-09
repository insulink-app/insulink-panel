import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import PanelPage from "@/layouts/panel";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/card-skeleton";
import { PageHeader } from "@/components/page-header";
import healthService from "@/api/services/health-service";
import { formatDay } from "@/lib/when";
import { NightCard, NightSideCard } from "./night-cards";
import { DurationCard, NightsList } from "./nights-cards";

export default function SleepPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ["health-days"], queryFn: healthService.days });

  // Only nights with recorded sleep, newest first.
  const nights = useMemo(
    () => (data?.days ?? []).filter((day) => day.sleep != null).sort((left, right) => right.d.localeCompare(left.d)),
    [data],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const index = Math.max(0, nights.findIndex((night) => night.d === selectedKey));
  const selected = nights[index];

  return (
    <PanelPage title={t("sleep.title")} parents={[{ title: t("nav.health") }]}>
      <PageHeader
        title={t("sleep.title")}
        actions={
          selected && (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="bg-raised-strong"
                aria-label={t("sleep.previous")}
                disabled={index >= nights.length - 1}
                onClick={() => setSelectedKey(nights[index + 1].d)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <b className="px-1.5 text-[15px]">{formatDay(new Date(selected.d).getTime(), t, i18n.language)}</b>
              <Button
                size="icon"
                variant="secondary"
                className="bg-raised-strong"
                aria-label={t("sleep.next")}
                disabled={index === 0}
                onClick={() => setSelectedKey(nights[index - 1].d)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )
        }
      />
      {isLoading ? (
        <CardSkeleton />
      ) : !selected ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <NightCard night={selected} />
            <NightSideCard night={selected} />
          </div>
          <div className="grid items-stretch gap-4 lg:grid-cols-2">
            <DurationCard nights={nights} />
            <NightsList nights={nights} selected={selected.d} onSelect={setSelectedKey} />
          </div>
        </div>
      )}
    </PanelPage>
  );
}
