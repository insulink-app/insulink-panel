import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { Link } from "react-router-dom";
import * as React from "react";

export interface Crumb {
  title: string;
  // Omit for a section that has no page of its own.
  href?: string;
}

interface AppHeaderProps {
  title?: string;
  parents?: Crumb[];
}

export function AppHeader({ title, parents }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b-1">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {title && (
          <Breadcrumb>
            <BreadcrumbList>
              {(parents ?? []).map((parent) => (
                <React.Fragment key={parent.title}>
                  <BreadcrumbItem className="hidden sm:block">
                    {parent.href ? (
                      <BreadcrumbLink asChild>
                        <Link to={parent.href}>{parent.title}</Link>
                      </BreadcrumbLink>
                    ) : (
                      parent.title
                    )}
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:block" />
                </React.Fragment>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
    </header>
  );
}
