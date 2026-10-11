import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";

export type ListColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  // applied to header cell + body cells (e.g. "text-right", "w-32")
  className?: string;
};

// One card whose rows are separated by hairlines.
// ponytail: read-only lists only — no sort/search/filter/column-toggle/select.
// Add search back on a page that actually needs it.
export function DataList<T>({
  title,
  action,
  columns,
  data,
  isLoading,
  pageSize = 15,
  empty,
  onRowClick,
}: {
  title?: string;
  /** A control at the header's right, such as a sort select. */
  action?: ReactNode;
  columns: ListColumn<T>[];
  data: T[];
  isLoading?: boolean;
  pageSize?: number;
  empty?: string;
  onRowClick?: (row: T) => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(data.length / pageSize));
  const current = Math.min(page, pages - 1);
  const rows = data.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="min-w-0 rounded-3xl border bg-card p-6">
      {title && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg leading-tight font-extrabold">
            {title}
            {!isLoading && (
              <span className="ml-2 text-[13px] font-normal text-muted-foreground">{formatNumber(data.length)}</span>
            )}
          </h2>
          {action}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-xs text-muted-foreground">
              {columns.map((c, i) => (
                <th key={i} className={cn("py-3 pr-4 font-normal last:pr-0", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, r) => (
                <tr key={r} className="border-b border-divider last:border-0">
                  {columns.map((c, i) => (
                    <td key={i} className={cn("py-3.5 pr-4 last:pr-0", c.className)}>
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-muted-foreground"
                >
                  {empty ?? t("common.no_data_available")}
                </td>
              </tr>
            ) : (
              rows.map((row, r) => (
                <tr
                  key={r}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-divider last:border-0 transition-colors",
                    onRowClick && "hover:bg-raised/50",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((c, i) => (
                    <td
                      key={i}
                      className={cn(
                        "py-3.5 pr-4 whitespace-nowrap last:pr-0",
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && !isLoading && (
        <div className="mt-2 flex items-center justify-between border-t border-divider pt-4 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {t("table.page")} {current + 1} {t("table.of")} {pages}
          </span>
          <div className="flex gap-1">
            <button
              className="grid size-10 place-items-center rounded-full bg-secondary text-foreground hover:bg-accent disabled:opacity-40"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label={t("common.previous_page")}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="grid size-10 place-items-center rounded-full bg-secondary text-foreground hover:bg-accent disabled:opacity-40"
              onClick={() => setPage(current + 1)}
              disabled={current >= pages - 1}
              aria-label={t("common.next_page")}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
