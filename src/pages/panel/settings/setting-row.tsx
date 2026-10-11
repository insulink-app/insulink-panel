import type { ReactNode } from "react";

/**
 * One form row: the label (with an optional one-line hint and a coloured dot)
 * at the left, the control at the right.
 */
export function SettingRow({
  label,
  hint,
  dot,
  children,
}: {
  label: string;
  hint?: string;
  dot?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <span className="flex min-w-0 items-center gap-3">
        {dot && <i aria-hidden className="block size-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />}
        <span className="min-w-0">
          <b className="block text-[15px] font-bold">{label}</b>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </span>
      </span>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** A small accent heading that opens a group of rows ("Alarme"). */
export function SettingGroupLabel({ children }: { children: ReactNode }) {
  return <h3 className="pt-6 pb-1 text-[13px] font-extrabold text-brand-text">{children}</h3>;
}
