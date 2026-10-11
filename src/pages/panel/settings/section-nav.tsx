import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS } from "./sections";

/** The settings tabs as a vertical list in the sidebar's active style. */
export function SettingsNav({ current }: { current: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.settings")} className="flex flex-col gap-1">
      {SETTINGS_SECTIONS.map(({ id, icon: Icon }) => {
        const active = id === current;
        return (
          <Link
            key={id}
            to={`/settings/${id}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] transition-colors",
              active ? "bg-brand/16 font-extrabold text-nav-active-text" : "text-nav-text hover:bg-panel hover:text-foreground",
            )}
          >
            <Icon size={18} className={active ? "text-brand" : "text-nav-icon"} aria-hidden />
            {t("settings.section_" + id)}
          </Link>
        );
      })}
    </nav>
  );
}
