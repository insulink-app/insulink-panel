import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarBlank } from "@/components/icons";
import { cn } from "@/lib/utils";

/** The pinned column-heading row's height. */
const HEADER_HEIGHT = 30;

/**
 * A list scrolling inside its card: it fills the card's free height (at least
 * `minHeight`), fades into the card colour at the bottom, and calls
 * `onNearEnd` when its end comes within reach. `loaded` is how many items are
 * in it, so a page that still leaves the end in sight asks for the next one.
 * `header` (column headings) sits inside the scroll area, pinned at the top, so
 * it shares the rows' exact width; sticky day headings below it start under it
 * via `--list-head`.
 */
export function ScrollPane({
  children,
  onNearEnd,
  hasMore,
  loaded,
  minHeight = 440,
  className,
  header,
}: {
  children: ReactNode;
  header?: ReactNode;
  onNearEnd: () => void;
  hasMore: boolean;
  loaded: number;
  minHeight?: number;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nearEnd = useRef(onNearEnd);
  useEffect(() => {
    nearEnd.current = onNearEnd;
  });
  useEffect(() => {
    if (!hasMore || !endRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          nearEnd.current();
        }
      },
      { root: rootRef.current, rootMargin: "0px 0px 400px 0px" },
    );
    observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [hasMore, loaded]);
  return (
    <div className={cn("relative min-h-0 flex-1", className)} style={{ minHeight }}>
      <div
        ref={rootRef}
        data-scroll-root
        className="scroll-thin absolute inset-0 overflow-y-auto overscroll-contain pr-2 pb-16"
        style={{ "--list-head": header ? `${HEADER_HEIGHT}px` : "0px" } as React.CSSProperties}
      >
        {header && (
          <div className="sticky top-0 z-20 flex items-end bg-panel" style={{ height: HEADER_HEIGHT }}>
            <div className="w-full pb-2">{header}</div>
          </div>
        )}
        {children}
        <div ref={endRef} aria-hidden className="h-px" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-b from-transparent to-panel" />
    </div>
  );
}

/** The calendar button in a list card's header: picks a day to scroll the list to. */
export function JumpToDate({ onPick }: { onPick: (dayStart: number) => void }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <span className="relative">
      <button
        type="button"
        aria-label={t("common.jump_to_date")}
        title={t("common.jump_to_date")}
        onClick={() => inputRef.current?.showPicker()}
        className="grid size-10 place-items-center rounded-full bg-raised transition-colors hover:bg-raised-strong"
      >
        <CalendarBlank className="size-4" aria-hidden />
      </button>
      <input
        ref={inputRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        max={new Date().toISOString().slice(0, 10)}
        onChange={(event) => {
          const [year, month, day] = event.target.value.split("-").map(Number);
          if (year) {
            onPick(new Date(year, month - 1, day).getTime());
          }
        }}
        className="pointer-events-none absolute right-0 bottom-0 size-0 opacity-0"
      />
    </span>
  );
}
