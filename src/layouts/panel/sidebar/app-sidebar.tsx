"use client";

import * as React from "react";
import {
  Activity,
  CupSoda,
  Cpu,
  Droplet,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  Package,
  Ruler,
  Syringe,
  Timer,
  Utensils,
  CalendarDays,
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
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useUserInformation } from "@/store/user-store.ts";

export function AppNavigation(t: TFunction) {
  return [
    {
      title: t("nav.overview"),
      url: "/overview/",
      icon: LayoutDashboard,
      isActive: false,
      items: [],
    },
    {
      title: t("nav.glucose"),
      url: "/glucose/",
      icon: Droplet,
      isActive: false,
      items: [],
    },
    {
      title: t("nav.nutrition"),
      url: "/nutrition/",
      icon: Utensils,
      isActive: false,
      items: [
        { title: t("nav.meals"), url: "/nutrition/meals", icon: Utensils },
        { title: t("nav.drinks"), url: "/nutrition/drinks", icon: CupSoda },
        { title: t("nav.products"), url: "/nutrition/products", icon: Package },
      ],
    },
    {
      title: t("nav.health"),
      url: "/health/",
      icon: Activity,
      isActive: false,
      items: [
        { title: t("nav.workouts"), url: "/health/workouts", icon: Dumbbell },
        { title: t("nav.cardio"), url: "/health/cardio", icon: Timer },
        { title: t("nav.measurements"), url: "/health/measurements", icon: Ruler },
        { title: t("nav.health_days"), url: "/health/days", icon: CalendarDays },
        { title: t("nav.pulse"), url: "/health/pulse", icon: HeartPulse },
      ],
    },
    {
      title: t("nav.devices"),
      url: "/devices/",
      icon: Cpu,
      isActive: false,
      items: [
        { title: t("nav.sensor"), url: "/devices/sensor", icon: Droplet },
        { title: t("nav.pump"), url: "/devices/pump", icon: Syringe },
      ],
    },
  ];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
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
          <SidebarNavigation items={AppNavigation(t)} />
        </SidebarContent>
        <SidebarFooter>
          <SidebarUser user={user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </div>
  );
}
