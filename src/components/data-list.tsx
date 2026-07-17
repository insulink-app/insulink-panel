import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type ListColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  // applied to header cell + body cells (e.g. "text-right", "w-32")
  className?: string;
};

// ponytail: read-only lists only — no sort/search/filter/column-toggle/select.
// Add search back on a page that actually needs it.
export function DataList<T>({
  title,
  columns,
  data,
  isLoading,
  pageSize = 15,
  empty,
  onRowClick,
}: {
  title?: string;
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
    <div className="rounded-2xl border bg-card overflow-hidden">
      {title && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b">
          <h3 className="font-semibold">{title}</h3>
          {!isLoading && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {data.length}
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {columns.map((c, i) => (
                <th key={i} className={cn("px-5 py-3 font-medium", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, r) => (
                <tr key={r} className="border-b last:border-0">
                  {columns.map((c, i) => (
                    <td key={i} className={cn("px-5 py-3.5", c.className)}>
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-muted-foreground"
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
                    "border-b last:border-0 transition-colors hover:bg-muted/40",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((c, i) => (
                    <td
                      key={i}
                      className={cn(
                        "px-5 py-3.5 whitespace-nowrap",
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
        <div className="flex items-center justify-between px-5 py-3 border-t text-sm text-muted-foreground">
          <span className="tabular-nums">
            {t("table.page")} {current + 1} {t("table.of")} {pages}
          </span>
          <div className="flex gap-1">
            <button
              className="rounded-lg border p-1.5 hover:bg-muted disabled:opacity-40"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label={t("common.previous_page")}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="rounded-lg border p-1.5 hover:bg-muted disabled:opacity-40"
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
