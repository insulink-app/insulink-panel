import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ScrollPane } from "@/components/scroll-pane";
import { dayKey, useInfinitePaging } from "@/hooks/use-infinite-paging";
import { formatDay } from "@/lib/when";

export interface TimelineItem {
  key: string;
  time: number;
  /** The rail dot's and the icon's colour: the item's type. */
  color: string;
  icon: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  /** Whatever stands at the right: a value, a range strip. */
  aside?: ReactNode;
  to?: string;
}

/**
 * Entries grouped by day, each day joined by a 2 px rail with a dot in the
 * entry's type colour, so a list of events reads as a timeline. `items`
 * arrive newest first; the list scrolls inside its card and loads older days
 * as its end comes near. `columns` is an optional heading row above it.
 */
export function TimelineList({
  items,
  countLabel,
  jumpTo,
  columns,
  minHeight,
}: {
  items: TimelineItem[];
  /** The muted count beside a day heading ("6 Ereignisse"). */
  countLabel: (count: number) => string;
  /** A day (epoch ms of its start) to scroll to, from the card's calendar button. */
  jumpTo?: number;
  columns?: ReactNode;
  minHeight?: number;
}) {
  const { t, i18n } = useTranslation();
  const paging = useInfinitePaging(
    items.map((item) => item.time),
    jumpTo,
  );
  const groups = new Map<string, TimelineItem[]>();
  for (const item of items.slice(0, paging.visible)) {
    const key = dayKey(item.time);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollPane onNearEnd={paging.loadMore} hasMore={paging.hasMore} loaded={paging.visible} minHeight={minHeight} header={columns}>
        <div id={paging.listId}>
          {[...groups.values()].map((group, groupIndex) => (
            <section key={group[0].key} data-day={dayKey(group[0].time)} className={groupIndex > 0 ? "mt-3" : ""}>
              <div className="sticky top-(--list-head) z-10 flex items-baseline gap-2 bg-panel pt-1 pb-1.5">
                <h3 className="text-[13px] font-extrabold">{formatDay(group[0].time, t, i18n.language)}</h3>
                <span className="text-xs text-label">{countLabel(group.length)}</span>
              </div>
              {group.map((item, index) => (
                <TimelineRow key={item.key} item={item} first={index === 0} last={index === group.length - 1} />
              ))}
            </section>
          ))}
        </div>
      </ScrollPane>
    </div>
  );
}

function TimelineRow({ item, first, last }: { item: TimelineItem; first: boolean; last: boolean }) {
  const body = (
    <>
      <span className="w-11 shrink-0 text-[13px] font-bold text-muted-foreground">
        {format(new Date(item.time), "HH:mm")}
      </span>
      <span className="relative block w-3.5 shrink-0 self-stretch" aria-hidden>
        {!(first && last) && (
          <i
            className="absolute left-1.5 w-0.5 bg-divider"
            style={{ top: first ? "50%" : 0, bottom: last ? "50%" : 0 }}
          />
        )}
        <i
          className="absolute top-[calc(50%-5px)] left-0.5 size-2.5 rounded-full ring-[3px] ring-panel"
          style={{ backgroundColor: item.color }}
        />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="grid size-6 shrink-0 place-items-center rounded-full [&_svg]:size-3.5"
          style={{ color: item.color, backgroundColor: `color-mix(in srgb, ${item.color} 16%, transparent)` }}
        >
          {item.icon}
        </span>
        <b className="truncate text-[15px] font-extrabold">{item.title}</b>
        {item.detail && <span className="truncate text-xs text-muted-foreground">{item.detail}</span>}
      </span>
      {item.aside && <span className="shrink-0">{item.aside}</span>}
    </>
  );
  const rowClass = "flex min-h-[46px] items-center gap-3.5";
  if (item.to) {
    return (
      <Link to={item.to} className={`${rowClass} rounded-md transition-opacity hover:opacity-80`}>
        {body}
      </Link>
    );
  }
  return <div className={rowClass}>{body}</div>;
}
