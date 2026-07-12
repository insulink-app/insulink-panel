import client from "../client";

// glucose `time` is minute-aligned epoch ms (matching the app's glucose sync).
export interface GlucoseEntry {
  value: number; // mg/dL
  time: number; // epoch ms
}

export type GlucoseHistoryResponse = {
  success: boolean;
  entries?: GlucoseEntry[];
};

const history = () =>
  client.get<GlucoseHistoryResponse>({ url: "/glucose/history/" });

export default { history };
