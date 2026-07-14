import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder rows shaped like the card lists the panel pages render. */
export function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, row) => (
        <Skeleton key={row} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
