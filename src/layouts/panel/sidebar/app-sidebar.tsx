import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Activity,
  CalendarClock,
  ChartLine,
  CupSoda,
  Cpu,
  Download,
  Droplet,
  Dumbbell,
  Heart,
  LayoutDashboard,
  Moon,
  Package,
  Ruler,
  Running,
  Syringe,
  Utensils,
} from "@/components/icons";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { useUserInformation } from "@/store/user-store.ts";
import { SidebarNavigation, type NavGroup } from "./navigation";
import { SidebarUser } from "./user";
import { useDeviceStatus } from "./use-device-status";

/**
 * The navigation, grouped the way the sidebar shows it. The first group has no
 * label. Settings is not an entry: it opens from the gear in the user row.
 */
export function AppNavigation(t: TFunction, status: { sensor: boolean; pump: boolean }): NavGroup[] {
  return [
    {
      items: [
        { title: t("nav.overview"), url: "/overview", icon: LayoutDashboard },
        { title: t("nav.glucose"), url: "/glucose", icon: Droplet },
        { title: t("nav.events"), url: "/events", icon: CalendarClock },
      ],
    },
    {
      label: t("nav.health"),
      items: [
        { title: t("nav.routines"), url: "/health/routines", icon: Dumbbell },
        { title: t("nav.exercises"), url: "/health/routines/exercises", icon: Running },
        { title: t("nav.exercise_stats"), url: "/health/routines/stats", icon: ChartLine },
        { title: t("nav.activity"), url: "/health/activity", icon: Activity },
        { title: t("nav.pulse"), url: "/health/pulse", icon: Heart },
        { title: t("nav.sleep"), url: "/health/sleep", icon: Moon },
        { title: t("nav.body"), url: "/health/body", icon: Ruler },
      ],
    },
    {
      label: t("nav.nutrition"),
      items: [
        { title: t("nav.meals"), url: "/nutrition/meals", icon: Utensils },
        { title: t("nav.drinks"), url: "/nutrition/drinks", icon: CupSoda },
        { title: t("nav.products"), url: "/nutrition/products", icon: Package },
      ],
    },
    {
      label: t("nav.devices"),
      items: [
        { title: t("nav.sensor"), url: "/devices/sensor", icon: Cpu, connected: status.sensor },
        { title: t("nav.pump"), url: "/devices/pump", icon: Syringe, connected: status.pump },
      ],
    },
  ];
}

export function AppSidebar() {
  const { t } = useTranslation();
  const userInformation = useUserInformation();
  const status = useDeviceStatus();
  return (
    <Sidebar collapsible="offcanvas" className="z-40">
      <SidebarHeader className="px-3 pt-4 pb-0">
        <Link to="/overview/" className="flex items-center gap-2.5 rounded-[10px] px-1.5 pt-0.5 pb-4">
          <span className="grid size-7 place-items-center rounded-[9px] bg-primary p-1">
            <img src="/logo-white.png" alt="" className="size-full object-contain dark:hidden" />
            <img src="/logo-black.png" alt="" className="hidden size-full object-contain dark:block" />
          </span>
          <b className="text-base tracking-tight text-foreground">Insulink</b>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarNavigation groups={AppNavigation(t, status)} />
      </SidebarContent>
      <SidebarFooter className="gap-0 px-3 pt-3 pb-4">
        <SidebarNavigation
          groups={[{ items: [{ title: t("nav.export"), url: "/export", icon: Download }] }]}
        />
        <SidebarUser name={userInformation?.name ?? ""} />
      </SidebarFooter>
    </Sidebar>
  );
}
