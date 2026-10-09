import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { CardSkeleton } from "@/components/card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export interface SectionFigure {
  label: string;
  value: ReactNode;
  unit?: string;
}

/**
 * A titled overview section: today's main figure large, two secondary figures
 * beside it behind hairlines, then the newest entries as a divider list.
 */
export function SectionCard({
  title,
  to,
  primary,
  secondary,
  loading,
  empty,
  children,
}: {
  title: string;
  to: string;
  primary: SectionFigure;
  secondary: SectionFigure[];
  loading?: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card className="h-full gap-0 p-6">
      <div className="mb-4">
        <CardHeading title={title} viewAll={to} />
      </div>
      <div className="flex items-end gap-[18px]">
        <div className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">{primary.label}</span>
          {loading ? (
            <Skeleton className="mt-1 h-10 w-28" />
          ) : (
            <>
              <b className="text-[40px] leading-[1.1] font-extrabold tracking-[-0.03em]">{primary.value}</b>
              {primary.unit && <span className="text-base font-bold text-muted-foreground"> {primary.unit}</span>}
            </>
          )}
        </div>
        {secondary.map((figure) => (
          <div key={figure.label} className="border-l border-divider pl-[18px]">
            <span className="block text-xs text-muted-foreground">{figure.label}</span>
            <b className="text-lg font-extrabold">{loading ? "–" : figure.value}</b>
            {figure.unit && <span className="text-xs font-bold text-muted-foreground"> {figure.unit}</span>}
          </div>
        ))}
      </div>
      <div className="mt-5 mb-1.5 h-px bg-divider" />
      <div className="divide-y divide-divider">
        {loading ? (
          <div className="pt-3">
            <CardSkeleton rows={3} />
          </div>
        ) : empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("common.no_data")}</p>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
