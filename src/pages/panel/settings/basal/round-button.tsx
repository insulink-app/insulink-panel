import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A round icon-only button; `label` is its accessible name. */
export function RoundButton({
  label,
  onClick,
  quiet,
  children,
}: {
  label: string;
  onClick: () => void;
  /** No surface, only the icon (a row's delete). */
  quiet?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full transition-colors",
        quiet ? "text-muted-foreground hover:bg-raised hover:text-foreground" : "bg-raised hover:bg-raised-strong",
      )}
    >
      {children}
    </button>
  );
}
