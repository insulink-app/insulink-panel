import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { CardSkeleton } from "@/components/card-skeleton";
import { StatStrip, type StatCell } from "@/components/stat-strip";

/**
 * A titled overview section: today's figures in one stat strip over the newest
 * entries as a divider list, linking on to the full page.
 */
export function SectionCard({
  title,
  to,
  cells,
  loading,
  empty,
  children,
}: {
  title: string;
  to: string;
  cells: StatCell[];
  loading?: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card className="h-full gap-0 p-6">
      <CardHeading title={title} viewAll={to} />
      <div className="mt-[18px]">
        <StatStrip cells={cells} loading={loading} />
      </div>
      <div className="mt-2 divide-y divide-divider">
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
