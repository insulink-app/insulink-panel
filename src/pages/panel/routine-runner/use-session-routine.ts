// The routine as THIS session runs it: the stored one (or the account's copy)
// plus the exercises added and swapped while it runs. Neither change touches
// the stored routine; both ride along until the account's snapshot, which
// embeds the items, carries them itself.
import { useMemo, useState } from "react";
import type { Routine, RoutineItem } from "@/api/services/sport-service";

export function useSessionRoutine(stored: Routine) {
  const [added, setAdded] = useState<RoutineItem[]>([]);
  // Replaced item id -> the item that took its place.
  const [swapped, setSwapped] = useState<Record<string, RoutineItem>>({});

  const routine = useMemo<Routine>(
    () => ({ ...stored, items: sessionItems(stored.items, added, swapped) }),
    [stored, added, swapped],
  );

  return {
    routine,
    add: (item: RoutineItem) => setAdded((current) => [...current, item]),
    swap: (replacedId: string, item: RoutineItem) =>
      setSwapped((current) => ({ ...current, [replacedId]: item })),
  };
}

// Stored items, then the added ones, each resolved through its swaps (a swap
// may itself be swapped again). Deduplicated by id: once the account's copy
// carries an added or swapped item, the local one resolves to the same id and
// must not show up twice.
function sessionItems(
  stored: RoutineItem[],
  added: RoutineItem[],
  swapped: Record<string, RoutineItem>,
) {
  const seen = new Set<string>();
  const items: RoutineItem[] = [];
  for (const original of [...stored, ...added]) {
    let item = original;
    while (swapped[item.id]) {
      item = swapped[item.id];
    }
    if (!seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}
