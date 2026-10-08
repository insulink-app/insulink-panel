// One shape for every number the runner takes: the value large in the middle
// over its label, round − and + either side. Reps can also be typed (the field keeps focus, so a set
// is a number and Enter); weight is only nudged in 2.5 kg steps.
import type { Ref } from "react";
import { Minus, Plus } from "@/components/icons";
import { formatNumber } from "@/lib/format";

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
    <div className="flex items-center justify-center gap-5">
      <StepButton label={props.decreaseLabel} onClick={props.onDecrease}>
        <Minus size={22} />
      </StepButton>
      <div className="flex min-w-24 flex-col items-center">
        {props.children}
        <span className="text-[13px] text-muted-foreground">{props.label}</span>
      </div>
      <StepButton label={props.increaseLabel} onClick={props.onIncrease}>
        <Plus size={22} />
      </StepButton>
    </div>
  );
}

function StepButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      className="grid size-[52px] shrink-0 place-items-center rounded-full bg-panel text-foreground transition-colors hover:bg-raised"
      onClick={props.onClick}
    >
      {props.children}
    </button>
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
        className="h-12 w-24 [appearance:textfield] rounded-xl border-0 bg-transparent p-0 text-center text-[44px] leading-none font-extrabold shadow-none outline-none selection:bg-primary/20 selection:text-foreground focus:ring-0 focus-visible:bg-panel [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
      <span className="flex h-12 w-32 items-center justify-center text-[32px] leading-none font-extrabold">
        {formatNumber(props.weight, 1)} {props.unit}
      </span>
    </Stepper>
  );
}
