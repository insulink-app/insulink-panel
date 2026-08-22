// Pod runtime maths. Kept out of `pump-service.ts` so it stays free of the Axios
// client — pure functions over the history entries, testable in node.
//
// Mirrors `@/lib/sensor`, and for the same reason: `registered_at` is when the
// app POSTed the registration, not when the pod started running.
import type { PumpHistoryEntry } from "@/api/services/pump-service";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** A pod's rated life before its grace window: 72 hours. */
export const POD_RATED_MS = 72 * HOUR_MS;

/** What a pod reports when it cannot measure its reservoir precisely. */
export const POD_DEFAULT_EXPIRY_HOURS = 80;

/**
 * The fields the panel reads out of the otherwise opaque `data` blob, written by
 * the app's `pump_sync.dart`.
 *
 * `long_term_key` is deliberately NOT declared here even though the blob carries
 * it. It is the credential that authorises delivering insulin, so nothing in the
 * panel should be able to reach for it by accident, let alone render it.
 */
interface PumpBlob {
  pump_type?: string;
  unique_id?: number;
  lot_number?: number;
  pod_sequence_number?: number;
  activated_at?: number;
  expiry_hours?: number;
  last_seen_at?: number;
  last_lifecycle?: string;
  reservoir_units?: number;
  total_delivered_units?: number;
}

export function pumpBlob(entry: PumpHistoryEntry): PumpBlob {
  try {
    const parsed = JSON.parse(entry.data);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * When the pod really started — NOT `registered_at`. The app registers a pod once
 * pairing completes, and a restore onto a fresh install re-registers a pod that
 * has already been running for hours.
 */
export function podStart(entry: PumpHistoryEntry): number {
  return pumpBlob(entry).activated_at ?? entry.registered_at;
}

/**
 * One entry per physical pod, earliest registration kept. A restore after an app
 * reset re-registers the running pod, so the same `unique_id` can hold several
 * rows.
 *
 * A pod's `unique_id` is derived from the controller id and is therefore the SAME
 * for every pod this app has ever activated — so it cannot identify one. The
 * activation time can: two pods are never activated in the same millisecond.
 */
export function uniquePods(
  allPods: PumpHistoryEntry[],
): PumpHistoryEntry[] {
  const byStart = new Map<number, PumpHistoryEntry>();
  for (const pod of allPods) {
    const key = podStart(pod);
    const seen = byStart.get(key);
    if (!seen || pod.registered_at < seen.registered_at) {
      byStart.set(key, pod);
    }
  }
  return [...byStart.values()];
}

/** The starts of every pod that began after this one. */
function successorStarts(
  pod: PumpHistoryEntry,
  allPods: PumpHistoryEntry[],
): number[] {
  const start = podStart(pod);
  return uniquePods(allPods)
    .map(podStart)
    .filter((otherStart) => otherStart > start);
}

/**
 * Still on the body: not discarded, not past its expiry, and not already
 * succeeded by a pod that started later.
 *
 * The succession half matters because a pod taken off early keeps a future
 * `expires_at`, so expiry alone would show two as active. `discarded_at` covers
 * what succession cannot: a pod that faulted, was deactivated or was thrown
 * away, with no replacement put on yet. Both of those leave a future expiry and
 * no successor, so without this the panel goes on calling a dead pod active
 * while the app has already stopped offering it.
 */
export function podActive(
  pod: PumpHistoryEntry,
  allPods: PumpHistoryEntry[],
): boolean {
  if (pod.discarded_at) {
    return false;
  }
  return (
    successorStarts(pod, allPods).length === 0 && pod.expires_at > Date.now()
  );
}

/**
 * When the pod came off — its expiry, or the start of the next one if that came
 * first. `null` while it is still running.
 */
export function podEndedAt(
  pod: PumpHistoryEntry,
  allPods: PumpHistoryEntry[],
): number | null {
  if (podActive(pod, allPods)) {
    return null;
  }
  // A discarded pod ended when the user said so, unless something ended it
  // earlier. Falling back to `expires_at` would credit it with hours it spent in
  // the bin.
  const discarded = pod.discarded_at ?? Number.POSITIVE_INFINITY;
  return Math.min(pod.expires_at, discarded, ...successorStarts(pod, allPods));
}

/** How long the pod was really worn. */
export function podWornMs(
  pod: PumpHistoryEntry,
  allPods: PumpHistoryEntry[],
): number {
  const end = podEndedAt(pod, allPods) ?? Date.now();
  return Math.max(0, end - podStart(pod));
}

/** The whole window the pod reports: its rated life plus its grace window. */
export function podSessionMs(pod: PumpHistoryEntry): number {
  return pod.expires_at - podStart(pod);
}

/**
 * Whole rated days, floored, matching how the app draws its life bar
 * (`DeviceLifespan.totalDays`): a pod's 80 h session is three rated days.
 */
export function podRatedMs(pod: PumpHistoryEntry): number {
  return Math.floor(podSessionMs(pod) / DAY_MS) * DAY_MS;
}

/** The grace window past the rated life (~8 h on a pod). */
export function podGraceMs(pod: PumpHistoryEntry): number {
  return podSessionMs(pod) - podRatedMs(pod);
}

/**
 * Rated life is up but the pod is still delivering inside its grace window.
 */
export function podInGrace(
  pod: PumpHistoryEntry,
  allPods: PumpHistoryEntry[],
): boolean {
  if (!podActive(pod, allPods)) {
    return false;
  }
  return Date.now() >= podStart(pod) + podRatedMs(pod);
}

/**
 * Units left in the reservoir as of the last time the app spoke to the pod, or
 * `null` when that is unknown — either no contact has been synced, or the pod
 * reported more than it can measure. Never guessed: a number the pod did not
 * give would invite decisions it cannot support.
 */
export function podReservoirUnits(pod: PumpHistoryEntry): number | null {
  const units = pumpBlob(pod).reservoir_units;
  return typeof units === "number" ? units : null;
}

/** Total insulin the pod reported delivering, or `null` if never synced. */
export function podDeliveredUnits(pod: PumpHistoryEntry): number | null {
  const units = pumpBlob(pod).total_delivered_units;
  return typeof units === "number" ? units : null;
}

/** When the app last spoke to this pod, or `null` if never synced. */
export function podLastSeenAt(pod: PumpHistoryEntry): number | null {
  const seen = pumpBlob(pod).last_seen_at;
  return typeof seen === "number" ? seen : null;
}

/** The pod's lot and sequence number as one identifier, or `null` if unknown. */
export function podLotLabel(pod: PumpHistoryEntry): string | null {
  const blob = pumpBlob(pod);
  if (blob.lot_number === undefined || blob.pod_sequence_number === undefined) {
    return null;
  }
  return `${blob.lot_number} / ${blob.pod_sequence_number}`;
}
