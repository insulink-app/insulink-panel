import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * One row of a divider list: an icon in a 36 px brand circle, a title over a
 * muted subtitle, and the figure at the right. Rows sit in one card or column
 * whose parent draws the hairlines (`divide-y divide-divider`). A `to` makes
 * the row a link.
 */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  to,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  to?: string;
  className?: string;
}) {
  const body = (
    <>
      {icon && (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/12 text-brand [&_svg]:size-[17px]">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <b className="block truncate text-sm">{title}</b>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {value != null && <b className="shrink-0 text-sm">{value}</b>}
    </>
  );
  const rowClass = cn("flex items-center gap-3 py-3", className);
  if (to) {
    return (
      <Link to={to} className={cn(rowClass, "rounded-md transition-opacity hover:opacity-80")}>
        {body}
      </Link>
    );
  }
  return <div className={rowClass}>{body}</div>;
}
