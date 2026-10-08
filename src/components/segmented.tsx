import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

/**
 * A range selector (3 h / 6 h / 24 h, 7 d / 30 d): a sunken track whose active
 * segment is filled in the brand colour.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for assistive tech. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex max-w-full flex-wrap gap-0.5 rounded-[18px] bg-ground p-[3px]", className)}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-[30px] rounded-[15px] px-3 text-[13px] font-bold whitespace-nowrap transition-colors",
              checked ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
