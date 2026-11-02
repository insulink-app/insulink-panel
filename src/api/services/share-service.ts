import client from "../client";
import type { GlucoseEntry } from "./glucose-service";

// A link that shows the owner's glucose, and nothing else, to whoever holds it
// (the api's docs/GLUCOSE_SHARE.md). `id` is the secret in the link; `name`
// says whom it was given to. `created_at` is epoch ms.
export interface GlucoseShare {
  id: string;
  name: string;
  created_at: number;
}

export type GlucoseSharesResponse = { success: boolean; shares?: GlucoseShare[] };

// The public reply: the last 24 h of glucose, mg/dL and epoch ms, oldest first.
export type SharedGlucoseResponse = { success: boolean; entries?: GlucoseEntry[] };

const find = () => client.get<GlucoseSharesResponse>({ url: "/glucose/share/find/" });

const create = (name: string) =>
  client.post<{ success: boolean }>({ url: "/glucose/share/create/", data: { name } });

const remove = (shareId: string) =>
  client.post<{ success: boolean }>({ url: "/glucose/share/delete/", data: { share_id: shareId } });

const shared = (shareId: string) =>
  client.get<SharedGlucoseResponse>({ url: `/share/${encodeURIComponent(shareId)}/` });

// Where a link opens: the public share page of this panel.
export function shareUrl(shareId: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}share/${shareId}`;
}

export default { find, create, remove, shared };
