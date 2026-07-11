import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { LogOut, Settings, User, UserRound } from "lucide-react";
import { SidebarThemeSelector } from "@/layouts/panel/sidebar/user/theme-selector.tsx";
import { SidebarLanguageSelector } from "@/layouts/panel/sidebar/user/language-selector.tsx";
import { useLogout } from "@/store/user-store.ts";
import { Link } from "react-router-dom";

export function SidebarUserDropdownContent({
  user,
}: {
  user: { name: string };
}) {
  const logout = useLogout();
  return (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg">
              <UserRound className="size-5" />
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link to="/account/">
            <User />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings/">
            <Settings />
            Einstellungen
          </Link>
        </DropdownMenuItem>
        <SidebarThemeSelector />
        <SidebarLanguageSelector />
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={async () => await logout()}>
        <LogOut />
        Abmelden
      </DropdownMenuItem>
    </>
  );
}
