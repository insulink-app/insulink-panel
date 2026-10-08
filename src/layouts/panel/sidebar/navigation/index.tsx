import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "@/components/icons";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { activeUrl } from "./active-url";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Set on device entries: a green dot when connected, grey when not. */
  connected?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export function SidebarNavigation({ groups }: { groups: NavGroup[] }) {
  const { pathname } = useLocation();
  const active = activeUrl(
    pathname,
    groups.flatMap((group) => group.items.map((item) => item.url)),
  );
  return (
    <nav className="flex flex-col">
      {groups.map((group, index) => (
        <div key={group.label ?? index} className="flex flex-col gap-px">
          {group.label && (
            <span className="mx-2.5 mt-3.5 mb-1 text-xs font-bold text-label">{group.label}</span>
          )}
          {group.items.map((item) => (
            <SidebarLink key={item.url} item={item} active={item.url === active} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = item.icon;
  return (
    <Link
      to={item.url}
      aria-current={active ? "page" : undefined}
      onClick={() => isMobile && setOpenMobile(false)}
      className={cn(
        "flex h-[34px] items-center gap-[11px] rounded-[10px] px-2.5 text-sm transition-colors",
        active ? "bg-panel font-bold text-foreground" : "text-nav-text hover:bg-panel/60 hover:text-foreground",
      )}
    >
      <Icon size={17} weight="regular" className={active ? "text-brand" : "text-nav-icon"} aria-hidden />
      <span className="truncate">{item.title}</span>
      {item.connected !== undefined && (
        <i
          aria-hidden
          className={cn(
            "ml-auto block size-[7px] rounded-full",
            item.connected ? "bg-glucose-in-range" : "bg-nav-icon/60",
          )}
        />
      )}
    </Link>
  );
}
