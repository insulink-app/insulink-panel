import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Settings } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarUserDropdownContent } from "@/layouts/panel/sidebar/user/dropdown-content.tsx";
import { SettingsDialog } from "@/layouts/panel/settings-dialog.tsx";

/**
 * The sidebar's last row: the avatar and name open the account menu (theme,
 * language, logout), the gear goes to the settings page.
 */
export function SidebarUser({ name }: { name: string }) {
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<string>();

  const openSettings = (category?: string) => {
    setSettingsCategory(category);
    setSettingsOpen(true);
  };

  return (
    <div className="mt-2 flex items-center gap-1 border-t px-1.5 pt-2.5">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] py-1 text-left">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-divider text-[13px] font-extrabold text-foreground">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <b className="truncate text-sm text-foreground">{name}</b>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-2xl"
          side={isMobile ? "top" : "right"}
          align="end"
          sideOffset={8}
        >
          <SidebarUserDropdownContent user={{ name }} onOpenSettings={openSettings} />
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        to="/settings/"
        aria-label={t("nav.settings")}
        className="grid size-8 shrink-0 place-items-center rounded-[10px] text-nav-icon transition-colors hover:bg-panel hover:text-foreground"
      >
        <Settings size={17} weight="regular" aria-hidden />
      </Link>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialCategory={settingsCategory}
      />
    </div>
  );
}
