import client from "../client";

export interface EventEntry {
  type: string;
  data: string;
  time: number; // epoch MILLISECONDS
}

export type EventHistoryResponse = {
  success: boolean;
  entries?: EventEntry[];
};

const history = () =>
  client.get<EventHistoryResponse>({ url: "/event/history/" });

export default { history };
