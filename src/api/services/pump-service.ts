import client from "../client";

// /pump/current/ -> { success, id, data }. `data` is an opaque pump blob written
// by the app's `pump_sync.dart`; `expires_at` is epoch MILLISECONDS.
export type PumpCurrentResponse = {
  success: boolean;
  id?: string;
  data?: string;
  type?: string;
  registered_at?: number;
  expires_at?: number;
};

const current = () =>
  client.get<PumpCurrentResponse>({ url: "/pump/current/" });

// /pump/history/ -> { success, pumps: [...] }. `registered_at`/`expires_at` are
// epoch MILLISECONDS; `data` is the opaque JSON blob.
export interface PumpHistoryEntry {
  id: string;
  type?: string;
  data: string;
  registered_at: number; // epoch ms
  expires_at: number; // epoch ms
  // When the user said this pod is gone, or null while it is still theirs to
  // pick up. The app sets it when a pod is deactivated, forgotten or abandoned
  // mid-activation. The row stays, because it is the pump history; what stops is
  // the app offering the pod back and this list calling it active.
  discarded_at?: number | null;
}

export type PumpHistoryResponse = {
  success: boolean;
  pumps?: PumpHistoryEntry[];
};

const history = () =>
  client.get<PumpHistoryResponse>({ url: "/pump/history/" });

// Map a pump type to a readable label. Keyed by both the blob's `pump_type` and
// the backend `PumpType` name, so it works whichever the caller has.
export const PUMP_TYPE_LABEL: Record<string, string> = {
  OMNIPOD_DASH: "Omnipod DASH",
  omnipod_dash: "Omnipod DASH",
};

/**
 * A missing or unrecognized type resolves to the Omnipod DASH — it is the only
 * pump the app drives, so a blob without a `pump_type` is one.
 */
export function pumpType(entry: PumpHistoryEntry): string {
  try {
    const key = JSON.parse(entry.data)?.pump_type as string | undefined;
    return (key && PUMP_TYPE_LABEL[key]) || PUMP_TYPE_LABEL.OMNIPOD_DASH;
  } catch {
    return PUMP_TYPE_LABEL.OMNIPOD_DASH;
  }
}

// The runtime maths over these entries lives in `@/lib/pump`.

export default { current, history };
