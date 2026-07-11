import client from "../client";

// NOTE: glucose `time` is epoch SECONDS (unlike events/meals/health which are ms).
export interface GlucoseEntry {
  value: number; // mg/dL
  time: number; // epoch seconds
}

export type GlucoseHistoryResponse = {
  success: boolean;
  entries?: GlucoseEntry[];
};

const history = () =>
  client.get<GlucoseHistoryResponse>({ url: "/glucose/history/" });

export default { history };
