import client from "../client";

export interface HealthDay {
  d: string; // date key
  rhr?: number; // resting heart rate
  sleep?: number; // minutes
  spo2?: number;
  rr?: number; // respiratory rate
}

export interface PulseSample {
  t: number; // epoch ms
  b: number; // bpm
}

const days = () =>
  client.get<{ success: boolean; days?: HealthDay[] }>({
    url: "/health/days/find/",
  });

const pulse = () =>
  client.get<{ success: boolean; samples?: PulseSample[] }>({
    url: "/health/pulse/find/",
  });

export default { days, pulse };
