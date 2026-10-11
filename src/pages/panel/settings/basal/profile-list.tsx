import { useTranslation } from "react-i18next";
import { Plus } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { CardHeading } from "@/components/card-heading";
import { StatusChip } from "@/components/status-chip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { deliveredTotal, type BasalProfiles } from "@/lib/basal";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BasalStepChart } from "./basal-step-chart";

/**
 * The profiles: the radio makes one active (saved straight away), a click on
 * the card opens it in the editor, and the dashed button adds one.
 */
export function ProfileList({
  state,
  selected,
  onSelect,
  onActivate,
  onAdd,
}: {
  state: BasalProfiles;
  selected: number;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="gap-0 p-6">
      <CardHeading
        title={t("basal.profiles")}
        action={<span className="text-xs text-muted-foreground">{t("basal.one_active")}</span>}
      />
      <RadioGroup value={String(state.active)} onValueChange={(value) => onActivate(Number(value))} className="mt-4 gap-3">
        {state.profiles.map((profile, index) => (
          <div
            key={index}
            role="button"
            tabIndex={0}
            aria-pressed={index === selected}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(index);
              }
            }}
            className={cn(
              "rounded-[20px] border bg-ground p-4 transition-colors",
              index === selected ? "border-brand bg-raised" : "border-transparent hover:border-divider",
            )}
          >
            <div className="flex items-center gap-3">
              <span onClick={(event) => event.stopPropagation()}>
                <RadioGroupItem
                  value={String(index)}
                  aria-label={profile.name}
                  className="size-6 border-2 data-[state=checked]:border-primary [&_svg]:size-3"
                />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[15px]">{profile.name}</b>
                <span className="text-xs text-muted-foreground">
                  {t("basal.total", { total: formatNumber(deliveredTotal(profile), 2) })}
                </span>
              </span>
              {index === state.active && <StatusChip color="var(--range)">{t("basal.active")}</StatusChip>}
            </div>
            <div className="mt-4">
              <BasalStepChart rates={profile.rates} height={64} />
            </div>
          </div>
        ))}
      </RadioGroup>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex h-12 items-center justify-center gap-2 rounded-[20px] border border-dashed border-divider text-sm font-bold transition-colors hover:bg-raised"
      >
        <Plus className="size-4" aria-hidden />
        {t("basal.add_profile")}
      </button>
    </Card>
  );
}
