import { useTranslation } from "react-i18next";
import { ArrowRight, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Routine, SetLog, SportExercise } from "@/api/services/sport-service";
import { formatClock } from "./core";
import { FinishButton, JumpHeader, WeightRow } from "./controls";

export function RestView(props: {
  expired: boolean;
  remaining: number;
  overtime: number;
  nextName: string;
  setNumber: number;
  totalSets: number;
  items: Routine["items"];
  exerciseById: (id: string) => SportExercise | undefined;
  onJump: (index: number) => void;
  lastSet?: SetLog;
  onUpdateLast: (patch: { reps?: number; kg?: number }) => void;
  onExtend: () => void;
  onContinue: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-stretch justify-center gap-4 text-center">
      <span className="text-lg font-medium tracking-widest text-muted-foreground uppercase">
        {t("routines.resting")}
      </span>
      <div
        className="text-[clamp(5rem,19vw,9rem)] leading-none font-bold tracking-tight tabular-nums"
        style={{ color: props.expired ? "var(--glucose-low)" : "var(--primary)" }}
      >
        {props.expired ? `+${formatClock(props.overtime)}` : formatClock(props.remaining)}
      </div>
      <JumpHeader
        label={`${t("routines.next")} ${props.nextName}  ·  ${t("routines.set")} ${props.setNumber}/${props.totalSets}`}
        items={props.items}
        exerciseById={props.exerciseById}
        onJump={props.onJump}
      />

      {props.lastSet && props.lastSet.reps != null && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-lg text-muted-foreground">{t("routines.previous_set")}</span>
          <Input
            type="number"
            min={0}
            value={props.lastSet.reps}
            onChange={(event) => props.onUpdateLast({ reps: Number(event.target.value) || 0 })}
            className="w-52 text-center text-6xl md:text-6xl font-bold h-24"
          />
          {props.lastSet.kg != null && (
            <WeightRow
              weight={props.lastSet.kg}
              onDelta={(delta) => props.onUpdateLast({ kg: (props.lastSet?.kg ?? 0) + delta })}
            />
          )}
        </div>
      )}

      <div className="mt-2 flex gap-3">
        <Button variant="outline" className="h-[4.5rem] flex-1 text-lg" onClick={props.onExtend}>
          <TimerReset className="size-6" />
          {t("routines.extend")}
        </Button>
        <Button className="h-[4.5rem] flex-1 text-lg" onClick={props.onContinue}>
          <ArrowRight className="size-6" />
          {t("routines.continue")}
        </Button>
      </div>
      <FinishButton onFinish={props.onFinish} />
    </div>
  );
}
