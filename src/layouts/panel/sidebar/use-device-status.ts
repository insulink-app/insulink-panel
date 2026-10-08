import { useQuery } from "@tanstack/react-query";
import sensorService from "@/api/services/sensor-service";
import pumpService from "@/api/services/pump-service";
import { sensorActive } from "@/lib/sensor";
import { podActive } from "@/lib/pump";

// Shares the device pages' query keys, so the sidebar and those pages read one
// cache. Five minutes stale: a sensor or pod changes over days, not per page.
const STALE_MS = 5 * 60_000;

/** Whether a sensor and a pod are currently running, for the sidebar's dots. */
export function useDeviceStatus() {
  const sensors = useQuery({
    queryKey: ["sensor-history"],
    queryFn: sensorService.history,
    staleTime: STALE_MS,
  });
  const pods = useQuery({
    queryKey: ["pump-history"],
    queryFn: pumpService.history,
    staleTime: STALE_MS,
  });
  const sensorList = sensors.data?.sensors ?? [];
  const podList = pods.data?.pumps ?? [];
  return {
    sensor: sensorList.some((sensor) => sensorActive(sensor, sensorList)),
    pump: podList.some((pod) => podActive(pod, podList)),
  };
}
