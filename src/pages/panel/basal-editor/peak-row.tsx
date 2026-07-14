import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PEAK_MAX_WEIGHT, PEAK_MIN_WEIGHT, type BasalPeak } from "@/lib/basal";

// One row of the curve generator: a single maximum with hour shift buttons, a
// height slider and a delete action. Every change regenerates the curve.
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
      <Button variant="outline" size="icon" aria-label={t("basal.peak_earlier")} onClick={() => shift(-1)}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="w-16 rounded-lg bg-primary/10 py-1 text-center text-sm font-bold text-primary">
        {String(Math.round(peak.h)).padStart(2, "0")}:00
      </span>
      <Button variant="outline" size="icon" aria-label={t("basal.peak_later")} onClick={() => shift(1)}>
        <ChevronRight className="size-4" />
      </Button>
      <Slider
        className="flex-1"
        min={PEAK_MIN_WEIGHT}
        max={PEAK_MAX_WEIGHT}
        step={0.05}
        value={[Math.min(Math.max(peak.w, PEAK_MIN_WEIGHT), PEAK_MAX_WEIGHT)]}
        onValueChange={([weight]) => onChange({ ...peak, w: weight })}
        aria-label={t("basal.peak_height")}
      />
      <Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={onDelete}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
