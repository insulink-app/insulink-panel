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

// The forecast curve, mirroring the app's glucose_prediction.dart. `offset_min`
// counts minutes from `generated_at`; the backend anchors it to the readings it
// already stores, so the panel sends none of its own.
export interface PredictionPoint {
  offset_min: number;
  mgdl: number;
}

export type GlucosePredictionResponse = {
  success: boolean;
  generated_at?: number; // epoch ms
  curve?: PredictionPoint[];
};

const history = () =>
  client.get<GlucoseHistoryResponse>({ url: "/glucose/history/" });

// A POST that only reads — the app's contract for the forecast endpoint, which
// takes the horizon (30 or 60 min) in the body.
const predict = (horizon: number) =>
  client.post<GlucosePredictionResponse>({
    url: "/glucose/predict/",
    data: { horizon, readings: [] },
  });

export default { history, predict };
