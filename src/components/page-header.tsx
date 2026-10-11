import type { ReactNode } from "react";

/**
 * A page's own heading row: the title (30/800) with an optional muted line
 * beneath, and the page's actions (a "New …" button, a range selector) at the
 * right.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-[22px] flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="min-w-[min(100%,12rem)] flex-1">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.02em] break-words">{title}</h1>
        {subtitle && <span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
