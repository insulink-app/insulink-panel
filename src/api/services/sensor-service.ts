import client from "../client";

// /sensor/current/ -> { success, id, data }. `data` is an opaque sensor blob;
// expiry (when present) is exposed by the backend as epoch MILLISECONDS.
export type SensorCurrentResponse = {
  success: boolean;
  id?: string;
  data?: string;
  type?: string;
  expires_at?: number;
};

const current = () =>
  client.get<SensorCurrentResponse>({ url: "/sensor/current/" });

export default { current };
