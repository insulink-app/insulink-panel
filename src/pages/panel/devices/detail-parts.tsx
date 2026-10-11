import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowLeft } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { formatSpan } from "@/lib/sensor";
import { formatDay, formatWhen } from "@/lib/when";
import { cn } from "@/lib/utils";
import { isRunning, STATUS_COLOR, type DeviceRecord } from "./records";
import { RuntimeSegments } from "./runtime-segments";

/** The round "back to the list" pill above a device page. */
export function BackPill({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-2 self-start rounded-full border border-divider px-4 text-sm font-bold hover:bg-raised"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}

/** The device open on the page: icon, name, and a status line. No change button: that happens in the app. */
export function DeviceHero({ icon, record, status }: { icon: ReactNode; record: DeviceRecord; status: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-[60px] shrink-0 place-items-center rounded-full bg-brand/12 text-brand [&_svg]:size-6">{icon}</span>
      <span className="min-w-0">
        <h1 className="truncate text-[30px] leading-tight font-extrabold">{record.name}</h1>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <i aria-hidden className="block size-[7px] rounded-full" style={{ backgroundColor: STATUS_COLOR[record.status] }} />
          {status}
        </span>
      </span>
    </div>
  );
}

/**
 * How much of the runtime is left (or how long it ran), the segments with the
 * hatched grace window, and when it started, runs out and must be changed.
 */
export function RuntimeCard({ record, startLabel }: { record: DeviceRecord; startLabel: string }) {
  const { t, i18n } = useTranslation();
  const running = isRunning(record);
  const ratedEnd = record.start + record.rated;
  const left = Math.max(0, (Date.now() < ratedEnd ? ratedEnd : record.expires) - Date.now());
  const stamp = (time: number) => formatWhen(time, t, i18n.language);
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={t("devices.runtime")} />
      <p className="mt-4 whitespace-nowrap">
        <b className="text-[52px] leading-none font-extrabold tracking-tight">{formatSpan(running ? left : record.worn, t)}</b>
        {running && <span className="ml-2 text-lg font-bold text-muted-foreground">{t("devices.left")}</span>}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("devices.rated_then_grace", { rated: formatSpan(record.rated, t), grace: formatSpan(record.grace, t) })}
      </p>
      <RuntimeSegments record={record} showGrace className="mt-6" />
      <div className="mt-2 flex justify-between text-[11px] text-label">
        <span>{formatDay(record.start, t, i18n.language)}</span>
        <span>{format(new Date(record.expires), "dd.MM.")}</span>
      </div>
      <FactRows
        className="mt-4"
        rows={[
          { label: startLabel, value: stamp(record.start) },
          { label: t("devices.expires"), value: stamp(ratedEnd) },
          record.end !== null && !running
            ? { label: t("devices.ended"), value: stamp(record.end) }
            : { label: t("devices.change_by"), value: stamp(record.expires) },
        ]}
      />
    </Card>
  );
}

export interface FactRow {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

/** Label and value as divider rows. */
export function FactRows({ rows, className }: { rows: FactRow[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-divider border-t border-divider", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 py-3.5 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <b className={cn("min-w-0 truncate text-right", row.mono && "font-mono text-[13px]")}>{row.value}</b>
        </div>
      ))}
    </div>
  );
}

/** A card of fact rows under a heading. */
export function FactsCard({ title, action, rows, children }: { title: string; action?: ReactNode; rows: FactRow[]; children?: ReactNode }) {
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={title} action={action} />
      {children}
      <FactRows rows={rows} className="mt-4" />
    </Card>
  );
}

export interface CompareRow {
  key: string;
  current: boolean;
  cells: ReactNode[];
}

/** The latest devices side by side; the one open on the page highlighted. */
export function CompareCard({ title, hint, columns, rows }: { title: string; hint: string; columns: string[]; rows: CompareRow[] }) {
  const grid = `grid items-center gap-3 px-2.5`;
  const template = { gridTemplateColumns: `minmax(0,1.5fr) minmax(0,1fr) repeat(${columns.length - 2}, minmax(0,0.8fr))` };
  return (
    <Card className="gap-0 p-6">
      <CardHeading title={title} action={<span className="text-xs text-muted-foreground">{hint}</span>} />
      <div className={`${grid} mt-4 pb-2.5 text-[11px] font-bold text-label`} style={template}>
        {columns.map((column, index) => (
          <span key={column} className={index > 1 ? "text-right" : ""}>
            {column}
          </span>
        ))}
      </div>
      <div className="divide-y divide-divider border-t border-divider">
        {rows.map((row) => (
          <div key={row.key} className={cn(`${grid} py-3 text-sm`, row.current && "rounded-xl bg-raised")} style={template}>
            {row.cells.map((cell, index) => (
              <span key={index} className={cn("min-w-0 truncate", index > 1 && "text-right font-bold", index === 1 && "text-muted-foreground")}>
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
