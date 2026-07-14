import client from "../client";

// Minutes spent in each sleep stage over the night.
export interface SleepStages {
  deep: number;
  rem: number;
  light: number;
  awake: number;
  restless?: number;
}

// One hypnogram segment: stage index (0=deep,1=rem,2=light,3=awake,4=restless,
// matching the app's SleepStage enum order) over [a, b] epoch ms.
export interface SleepSegment {
  s: number;
  a: number;
  b: number;
}

export interface HealthDay {
  d: string; // date key (yyyy-mm-dd)
  rhr?: number; // resting heart rate
  sleep?: number; // total sleep minutes
  spo2?: number;
  rr?: number; // respiratory rate
  stages?: SleepStages;
  tl?: SleepSegment[]; // hypnogram timeline
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

// The band's current bpm, relayed live by the phone (~1 Hz) through a server-side
// cache — no history, nothing stored. `b` is absent when the band went quiet: the
// backend only ever hands back a fresh reading, so its presence *is* the liveness
// check and no clock comparison is needed here.
const livePulse = () =>
  client.get<{ success: boolean; b?: number }>({
    url: "/health/pulse/live/find/",
  });

export default { days, pulse, livePulse };
