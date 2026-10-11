// One shape for sensors and pods, so the list and detail pages draw both alike.
import { pumpType, type PumpHistoryEntry } from "@/api/services/pump-service";
import { sensorType, type SensorHistoryEntry } from "@/api/services/sensor-service";
import {
  podActive,
  podEndedAt,
  podGraceMs,
  podInGrace,
  podLastSeenAt,
  podRatedMs,
  podReservoirUnits,
  podStart,
  podWornMs,
  pumpBlob,
  uniquePods,
} from "@/lib/pump";
import {
  sensorActive,
  sensorBlob,
  sensorEndedAt,
  sensorGraceMs,
  sensorRatedMs,
  sensorStart,
  sensorWornMs,
  uniqueSensors,
} from "@/lib/sensor";

/** Running, inside its grace window, ran to its end, or changed before it. */
export type DeviceStatus = "active" | "grace" | "expired" | "replaced";

export interface DeviceRecord {
  id: string;
  kind: "sensor" | "pod";
  name: string;
  /** The short identifier a row shows: the sensor code, or the pod's serial. */
  code?: string;
  start: number;
  expires: number;
  /** When it came off; null while it runs. */
  end: number | null;
  worn: number;
  rated: number;
  grace: number;
  status: DeviceStatus;
  /** Pods: units left at the last contact, null when unknown. */
  reservoir?: number | null;
  /** Pods: the lot number. */
  lot?: number;
  lastSeen?: number | null;
  registeredAt: number;
}

const statusOf = (active: boolean, grace: boolean, end: number | null, expires: number): DeviceStatus => {
  if (grace) {
    return "grace";
  }
  if (active) {
    return "active";
  }
  return (end ?? 0) < expires ? "replaced" : "expired";
};

/** Every physical sensor, newest first. */
export function sensorRecords(entries: SensorHistoryEntry[]): DeviceRecord[] {
  const all = uniqueSensors(entries);
  return all
    .map((sensor) => {
      const end = sensorEndedAt(sensor, all);
      const active = sensorActive(sensor, all);
      const rated = sensorRatedMs(sensor);
      const start = sensorStart(sensor);
      return {
        id: sensor.id,
        kind: "sensor" as const,
        name: sensorType(sensor.data),
        code: sensorBlob(sensor).pairing_code || undefined,
        start,
        expires: sensor.expires_at,
        end,
        worn: sensorWornMs(sensor, all),
        rated,
        grace: sensorGraceMs(sensor),
        status: statusOf(active, active && Date.now() >= start + rated, end, sensor.expires_at),
        registeredAt: sensor.registered_at,
      };
    })
    .sort((left, right) => right.start - left.start);
}

/** Every physical pod, newest first. */
export function podRecords(entries: PumpHistoryEntry[]): DeviceRecord[] {
  const all = uniquePods(entries);
  return all
    .map((pod) => {
      const end = podEndedAt(pod, all);
      const blob = pumpBlob(pod);
      return {
        id: pod.id,
        kind: "pod" as const,
        name: pumpType(pod),
        code: blob.pod_sequence_number !== undefined ? String(blob.pod_sequence_number) : undefined,
        start: podStart(pod),
        expires: pod.expires_at,
        end,
        worn: podWornMs(pod, all),
        rated: podRatedMs(pod),
        grace: podGraceMs(pod),
        status: statusOf(podActive(pod, all), podInGrace(pod, all), end, pod.expires_at),
        reservoir: podReservoirUnits(pod),
        lot: blob.lot_number,
        lastSeen: podLastSeenAt(pod),
        registeredAt: pod.registered_at,
      };
    })
    .sort((left, right) => right.start - left.start);
}

export const isRunning = (record: DeviceRecord) => record.status === "active" || record.status === "grace";

/** The colour a status chip and a runtime bar take for a device. */
export const STATUS_COLOR: Record<DeviceStatus, string> = {
  active: "var(--range)",
  grace: "var(--high)",
  expired: "var(--brand)",
  replaced: "var(--text-muted)",
};
