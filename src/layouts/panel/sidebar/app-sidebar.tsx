"use client";

import * as React from "react";
import {
  Activity,
  Droplet,
  LayoutDashboard,
  Settings,
  User,
  Utensils,
} from "lucide-react";

import { SidebarNavigation } from "./navigation";
import { SidebarUser } from "./user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { useUserInformation } from "@/store/user-store.ts";

export function AppNavigation() {
  return [
    {
      title: "Übersicht",
      url: "/overview/",
      icon: LayoutDashboard,
      isActive: false,
      items: [],
    },
    {
      title: "Glukose",
      url: "/glucose/",
      icon: Droplet,
      isActive: false,
      items: [],
    },
    {
      title: "Ernährung",
      url: "/nutrition/",
      icon: Utensils,
      isActive: false,
      items: [],
    },
    {
      title: "Sport & Gesundheit",
      url: "/health/",
      icon: Activity,
      isActive: false,
      items: [],
    },
    {
      title: "Einstellungen",
      url: "/settings/",
      icon: Settings,
      isActive: false,
      items: [],
    },
    {
      title: "Account",
      url: "/account/",
      icon: User,
      isActive: false,
      items: [],
    },
  ];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const userInformation = useUserInformation();
  const user = { name: userInformation?.name ?? "" };
  return (
    <div id="sidebar">
      <Sidebar className="z-40" collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/overview/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary p-1.5">
                    <img
                      src="/logo-white.png"
                      alt="Insulink"
                      className="size-full object-contain"
                    />
                  </div>
                  <span className="text-lg font-bold">Insulink</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNavigation items={AppNavigation()} />
        </SidebarContent>
        <SidebarFooter>
          <SidebarUser user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </div>
  );
}
