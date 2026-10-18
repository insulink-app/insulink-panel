import { useTranslation } from "react-i18next";
import { Maximize } from "@/components/icons";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const FRAME_CLASS = "relative block aspect-[4/5] w-full sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[440px]";

// The photo as one side of the foods card, whole and never cropped: phone photos
// are portrait, and a cover crop cut the plate in half. A blurred, dimmed copy of
// the same photo fills the frame's spare edges instead of grey bars. Opened
// large in a dialog. A skeleton of the same size holds the space while it
// loads, so the list beside it does not jump.
export function MealPhotoFrame({ image }: { image?: string }) {
  const { t } = useTranslation();
  if (!image) {
    return <Skeleton className={`${FRAME_CLASS} rounded-none`} />;
  }
  const source = `data:image/jpeg;base64,${image}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t("nutrition.meal_detail.photo_open")}
          className={`${FRAME_CLASS} group cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-inset`}
        >
          <img src={source} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover blur-2xl brightness-75" />
          <img src={source} alt="" className="absolute inset-0 size-full object-contain" />
          <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors group-hover:bg-black/65 [&_svg]:size-[18px]">
            <Maximize aria-hidden />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="w-auto gap-0 p-2 sm:max-w-[min(92vw,1100px)]">
        <DialogTitle className="sr-only">{t("nutrition.meal_detail.photo")}</DialogTitle>
        <img
          src={source}
          alt={t("nutrition.meal_detail.photo_alt")}
          className="max-h-[85vh] w-auto rounded-[20px] object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
