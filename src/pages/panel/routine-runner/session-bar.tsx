// The workout as a whole, in one quiet line above the current phase: time so
// far, how many sets of the plan are behind us, when it should end, and the two
// controls that act on the whole session (pause, finish).
import { useTranslation } from "react-i18next";
import { Pause, Play } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatClock } from "./core";
import { FinishButton } from "./controls";

export function SessionBar(props: {
  elapsed: number;
  doneSets: number;
  plannedSets: number;
  expectedEnd: string | null;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  const progress = props.plannedSets === 0 ? 0 : Math.min(1, props.doneSets / props.plannedSets);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {t("routines.total")}
          </span>
          <span className="text-3xl leading-tight font-bold tabular-nums">
            {formatClock(props.elapsed)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {props.expectedEnd && (
            <span className="mr-2 hidden text-sm text-muted-foreground sm:inline">
              {props.expectedEnd}
            </span>
          )}
          <Button
            variant={props.paused ? "default" : "outline"}
            size="icon"
            className="size-10 rounded-full"
            aria-label={props.paused ? t("routines.resume") : t("routines.pause")}
            onClick={props.paused ? props.onResume : props.onPause}
          >
            {props.paused ? <Play className="size-5" weight="fill" /> : <Pause className="size-5" weight="fill" />}
          </Button>
          <FinishButton onFinish={props.onFinish} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {props.plannedSets > 0 && (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {t("routines.sets_progress", { done: props.doneSets, planned: props.plannedSets })}
          </span>
        )}
      </div>
    </div>
  );
}
