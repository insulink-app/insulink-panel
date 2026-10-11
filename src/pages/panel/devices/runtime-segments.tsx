import { cn } from "@/lib/utils";
import type { DeviceRecord } from "./records";

const HOUR = 60 * 60 * 1000;

/** A sensor's segments are days; a pod's three days split into 6 h pieces. */
const segmentMs = (record: DeviceRecord) => (record.rated <= 3 * 24 * HOUR ? 6 * HOUR : 24 * HOUR);

/**
 * The rated runtime as segments filled up to the time worn, and, with
 * `showGrace`, one hatched segment for the grace window after it.
 */
export function RuntimeSegments({ record, showGrace, className }: { record: DeviceRecord; showGrace?: boolean; className?: string }) {
  const size = segmentMs(record);
  const count = Math.max(1, Math.round(record.rated / size));
  const fill = (index: number) => Math.min(1, Math.max(0, (record.worn - index * size) / size));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.round(record.rated / HOUR)}
      aria-valuenow={Math.round(Math.min(record.worn, record.rated) / HOUR)}
      className={cn("flex h-2.5 gap-1", className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="relative flex-1 overflow-hidden rounded-full bg-divider">
          <i className="absolute inset-y-0 left-0 block bg-brand" style={{ width: `${fill(index) * 100}%` }} />
        </span>
      ))}
      {showGrace && record.grace > 0 && (
        <span
          aria-hidden
          className="rounded-full"
          style={{
            flexGrow: record.grace / size,
            backgroundImage: "repeating-linear-gradient(135deg, var(--text-muted) 0 2px, transparent 2px 5px)",
            opacity: record.worn > record.rated ? 1 : 0.5,
          }}
        />
      )}
    </div>
  );
}
