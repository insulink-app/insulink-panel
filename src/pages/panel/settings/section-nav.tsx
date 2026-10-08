import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// The settings sections in the order the sidebar used to list them; basal has
// a page of its own, the others share the section page.
const SECTION_IDS = ["glucose", "bolus", "basal", "body", "activity_goals", "nutrition"];

/**
 * The way between the settings sections, shaped like a segmented control: the
 * sidebar only carries a gear to the settings, so the sections switch here.
 */
export function SettingsNav({ current }: { current: string }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("nav.settings")}
      className="mb-6 inline-flex max-w-full flex-wrap gap-0.5 self-start rounded-[18px] bg-panel p-[3px]"
    >
      {SECTION_IDS.map((id) => (
        <Link
          key={id}
          to={`/settings/${id}`}
          aria-current={id === current ? "page" : undefined}
          className={cn(
            "flex h-[30px] items-center rounded-[15px] px-3 text-[13px] font-bold whitespace-nowrap transition-colors",
            id === current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("settings.section_" + id)}
        </Link>
      ))}
    </nav>
  );
}
