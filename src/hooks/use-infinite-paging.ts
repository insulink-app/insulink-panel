import { useEffect, useId, useState } from "react";
import { format } from "date-fns";

const PAGE = 40;

/** The `yyyy-MM-dd` key a day group carries in `data-day`, so a jump can find it. */
export const dayKey = (time: number) => format(new Date(time), "yyyy-MM-dd");

/**
 * How many of `times` (newest first) a scrolling list shows: a page more each
 * time its end comes near, and enough to reach `jumpTo` (a day's epoch ms),
 * whose day group is then scrolled to the top of the list's scroll root. The
 * list element carries `listId` so the jump finds its own day groups.
 */
export function useInfinitePaging(times: number[], jumpTo?: number) {
  const listId = useId();
  const [visible, setVisible] = useState(PAGE);
  const [seenJump, setSeenJump] = useState<number>();
  const [jumpTarget, setJumpTarget] = useState<number>();
  if (jumpTo !== seenJump) {
    setSeenJump(jumpTo);
    if (jumpTo !== undefined) {
      const endOfDay = jumpTo + 24 * 60 * 60 * 1000;
      const reached = times.findIndex((time) => time < endOfDay);
      setVisible((count) => Math.max(count, (reached < 0 ? times.length : reached) + PAGE));
      setJumpTarget(reached < 0 ? undefined : times[reached]);
    }
  }
  useEffect(() => {
    if (jumpTarget === undefined) {
      return;
    }
    const target = document.getElementById(listId)?.querySelector<HTMLElement>(`[data-day="${dayKey(jumpTarget)}"]`);
    target?.closest<HTMLElement>("[data-scroll-root]")?.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  }, [jumpTarget, seenJump, listId]);
  return {
    visible,
    listId,
    hasMore: visible < times.length,
    loadMore: () => setVisible((count) => count + PAGE),
  };
}
