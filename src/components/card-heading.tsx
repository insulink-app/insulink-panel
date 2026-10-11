import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "@/components/icons";

/**
 * Every card's header: the title (18/800) at the left and, optionally, a
 * "View all ›" link or any other action at the right.
 */
export function CardHeading({
  title,
  viewAll,
  action,
}: {
  title: ReactNode;
  /** Where "View all ›" leads; omit for no link. */
  viewAll?: string;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg leading-tight font-extrabold">{title}</h2>
      {viewAll && (
        <Link
          to={viewAll}
          className="inline-flex items-center gap-1 rounded-md text-[13px] font-bold text-brand-text hover:underline"
        >
          {t("overview.view_all")}
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      )}
      {action}
    </div>
  );
}
