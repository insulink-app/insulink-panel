import type { ReactNode } from "react";

export interface DeviceBar {
  label: string;
  value: string;
  /** How full the bar is, 0..1. */
  fraction: number;
}

/**
 * The device in use, open on the page without a card: an icon circle, its
 * name, a status dot line, and its figures as labelled progress bars.
 */
export function DeviceHeader({
  icon,
  name,
  status,
  connected,
  bars,
}: {
  icon: ReactNode;
  name: string;
  status: string;
  connected: boolean;
  bars: DeviceBar[];
}) {
  return (
    <section className="mb-6 flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand/12 text-brand [&_svg]:size-[22px]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold">{name}</h2>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <i
              aria-hidden
              className={`block size-[7px] rounded-full ${connected ? "bg-glucose-in-range" : "bg-nav-icon/60"}`}
            />
            {status}
          </span>
        </div>
      </div>
      {bars.length > 0 && (
        <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          {bars.map((bar) => (
            <div key={bar.label} className="min-w-0">
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{bar.label}</span>
                <b>{bar.value}</b>
              </div>
              <div
                role="progressbar"
                aria-label={bar.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(1, bar.fraction) * 100)}
                className="h-2 overflow-hidden rounded bg-divider"
              >
                <i className="block h-full bg-primary" style={{ width: `${Math.min(1, Math.max(0, bar.fraction)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
