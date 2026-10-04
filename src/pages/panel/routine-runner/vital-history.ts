// How far back the vitals tiles look, and the line they draw. Long enough to
// read a course (is the glucose falling into the workout, did the pulse come
// down between sets), not just the last few readings.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import healthService from "@/api/services/health-service";

export type VitalPoint = { t: number; v: number };

export const GLUCOSE_WINDOW_HOURS = 3;
export const PULSE_WINDOW_MINUTES = 60;

const PULSE_WINDOW_MS = PULSE_WINDOW_MINUTES * 60_000;

// The pulse over the last hour: the stored curve, which the phone uploads in
// batches, topped up with the ~1 Hz live relay for the minutes it has not
// uploaded yet. Opening the runner therefore shows the hour at once instead of
// a line that starts from nothing.
export function usePulseHistory(bpm: number | undefined) {
  const { data: stored } = useQuery({
    queryKey: ["pulse"],
    queryFn: healthService.pulse,
    refetchInterval: 5 * 60_000,
  });
  const live = useLivePulse(bpm);
  return useMemo(() => {
    const since = Date.now() - PULSE_WINDOW_MS;
    const history = (stored?.samples ?? [])
      .filter((sample) => sample.t >= since)
      .map((sample) => ({ t: sample.t, v: sample.b }))
      .sort((left, right) => left.t - right.t);
    const storedUntil = history.length > 0 ? history[history.length - 1].t : 0;
    return [...history, ...live.filter((point) => point.t > storedUntil)];
  }, [stored, live]);
}

// The live relay kept as timed points, trimmed to the window.
function useLivePulse(bpm: number | undefined) {
  const pointsRef = useRef<VitalPoint[]>([]);
  const [points, setPoints] = useState<VitalPoint[]>([]);
  useEffect(() => {
    if (bpm == null) {
      return;
    }
    const now = Date.now();
    pointsRef.current = [
      ...pointsRef.current.filter((point) => point.t >= now - PULSE_WINDOW_MS),
      { t: now, v: bpm },
    ];
    setPoints(pointsRef.current);
  }, [bpm]);
  return points;
}
