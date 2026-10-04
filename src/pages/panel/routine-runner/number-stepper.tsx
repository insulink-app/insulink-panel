// One shape for every number the runner takes: the value large in the middle,
// − and + either side. Reps can also be typed (the field keeps focus, so a set
// is a number and Enter); weight is only nudged in 2.5 kg steps.
import type { Ref } from "react";
import { Minus, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";

type StepperProps = {
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  children: React.ReactNode;
};

function Stepper(props: StepperProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {props.label}
      </span>
      <div className="flex h-14 items-center gap-3">
        <StepButton label={props.decreaseLabel} onClick={props.onDecrease}>
          <Minus className="size-5" />
        </StepButton>
        {props.children}
        <StepButton label={props.increaseLabel} onClick={props.onIncrease}>
          <Plus className="size-5" />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={props.label}
      className="size-11 shrink-0 rounded-full bg-background"
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}

// Whole reps, typed or stepped by one.
export function RepsStepper({
  label,
  decreaseLabel,
  increaseLabel,
  reps,
  onReps,
  inputRef,
}: {
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  reps: number;
  onReps: (reps: number) => void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <Stepper
      label={label}
      decreaseLabel={decreaseLabel}
      increaseLabel={increaseLabel}
      onDecrease={() => onReps(reps - 1)}
      onIncrease={() => onReps(reps + 1)}
    >
      <input
        ref={inputRef}
        type="number"
        min={0}
        aria-label={label}
        value={reps}
        onChange={(event) => onReps(Number(event.target.value) || 0)}
        className="h-14 w-24 [appearance:textfield] border-0 bg-transparent p-0 shadow-none focus:ring-0 text-center text-5xl font-bold tabular-nums outline-none selection:bg-primary/20 selection:text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </Stepper>
  );
}

// Weight in kg, nudged in 2.5 kg steps.
export function WeightStepper(props: {
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  unit: string;
  weight: number;
  onDelta: (delta: number) => void;
}) {
  return (
    <Stepper
      label={props.label}
      decreaseLabel={props.decreaseLabel}
      increaseLabel={props.increaseLabel}
      onDecrease={() => props.onDelta(-2.5)}
      onIncrease={() => props.onDelta(2.5)}
    >
      <span className="w-32 text-center text-3xl font-bold tabular-nums">
        {props.weight.toFixed(1)} {props.unit}
      </span>
    </Stepper>
  );
}
