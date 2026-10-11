import { ChevronLeft, ChevronRight, Trash2 } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { PEAK_MAX_WEIGHT, PEAK_MIN_WEIGHT, type BasalPeak } from "@/lib/basal";
import { RoundButton } from "./round-button";

/**
 * One maximum of the curve generator: ‹ › to move its hour, a slider for its
 * height and a delete button. Every change regenerates the curve.
 */
export function BasalPeakRow({
  peak,
  onChange,
  onDelete,
}: {
  peak: BasalPeak;
  onChange: (peak: BasalPeak) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const shift = (delta: number) => onChange({ ...peak, h: (peak.h + delta + 24) % 24 });
  return (
    <div className="flex items-center gap-3 py-3">
      <RoundButton label={t("basal.peak_earlier")} onClick={() => shift(-1)}>
        <ChevronLeft className="size-4" />
      </RoundButton>
      <b className="w-12 text-center text-sm">{String(Math.round(peak.h)).padStart(2, "0")}:00</b>
      <RoundButton label={t("basal.peak_later")} onClick={() => shift(1)}>
        <ChevronRight className="size-4" />
      </RoundButton>
      <Slider
        className="mx-3 flex-1"
        min={PEAK_MIN_WEIGHT}
        max={PEAK_MAX_WEIGHT}
        step={0.05}
        value={[Math.min(Math.max(peak.w, PEAK_MIN_WEIGHT), PEAK_MAX_WEIGHT)]}
        onValueChange={([weight]) => onChange({ ...peak, w: weight })}
        aria-label={t("basal.peak_height")}
      />
      <RoundButton label={t("common.delete")} onClick={onDelete} quiet>
        <Trash2 className="size-4" />
      </RoundButton>
    </div>
  );
}
