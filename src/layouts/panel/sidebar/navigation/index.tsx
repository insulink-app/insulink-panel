import { ChevronRight, type LucideIcon } from "@/components/icons";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge.tsx";
import { Link } from "react-router-dom";
import { useLocation } from "react-use";
import { cn } from "@/lib/utils.ts";

export function SidebarNavigation({
  items,
}: {
  items: {
    title: string;
    url?: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items: {
      title: string;
      url: string;
      icon?: LucideIcon;
      notifications?: number;
      disabled?: boolean;
    }[];
  }[];
}) {
  const { pathname } = useLocation();
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) =>
          item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild={!subItem.disabled}
                          isActive={pathname === subItem.url}
                          className={cn(
                            subItem.disabled &&
                              "opacity-50 pointer-events-none",
                          )}
                        >
                          {subItem.disabled ? (
                            // Sub-items are text-only; only top-level items carry an icon.
                            <div className="flex items-center gap-2">
                              <span>{subItem.title}</span>
                            </div>
                          ) : (
                            <Link to={subItem.url}>
                              <span>{subItem.title}</span>
                              {subItem.notifications && (
                                <Badge className="ml-auto h-5 min-w-5 rounded-full px-1 pt-1 font-mono tabular-nums">
                                  {subItem.notifications}
                                </Badge>
                              )}
                            </Link>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.url}
              >
                <Link to={item.url!}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
