import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "@/components/icons";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardSkeleton } from "@/components/card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A titled overview section: a row of today's figures over a short list of the
 * newest entries, linking on to the full page.
 */
export function SectionCard({
  title,
  to,
  metrics,
  loading,
  children,
}: {
  title: string;
  to: string;
  metrics: ReactNode;
  loading?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <CardAction>
          <Link
            to={to}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("overview.view_all")}
            <ChevronRight className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="grid grid-cols-2 gap-6 border-b pb-5 sm:grid-cols-4">
          {metrics}
        </div>
        <div className="flex flex-1 flex-col justify-start">
          {loading ? <CardSkeleton rows={3} /> : children}
        </div>
      </CardContent>
    </Card>
  );
}

/** One of today's figures in a section's metric row. */
export function SectionMetric({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      )}
    </div>
  );
}

/** A compact clickable row: icon, title over subtitle, trailing figure. */
export function SectionRow({
  to,
  icon,
  title,
  subtitle,
  value,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <Link
      to={to}
      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/60"
    >
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <span className="text-sm tabular-nums text-muted-foreground">
        {value}
      </span>
    </Link>
  );
}
