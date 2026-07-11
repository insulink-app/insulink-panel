import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb.tsx";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { SidebarUserDropdownContent } from "@/layouts/panel/sidebar/user/dropdown-content.tsx";
import { useUserInformation } from "@/store/user-store.ts";

interface AppHeaderProps {
  title?: string;
  breadcrumb?: React.ReactNode;
}

export function AppHeader({ title, breadcrumb }: AppHeaderProps) {
  const userInformation = useUserInformation();
  const user = { name: userInformation?.name ?? "" };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b-1">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {title ? (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          breadcrumb
        )}
      </div>
      <div className="flex align-center ml-auto mr-4 h-5 items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="px-2">
              <Avatar className="size-5 rounded-sm">
                <AvatarFallback className="rounded-sm bg-transparent">
                  <UserRound className="size-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <SidebarUserDropdownContent user={user} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
