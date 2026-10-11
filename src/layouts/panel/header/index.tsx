import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Fragment } from "react";
import { PanelLeftIcon } from "@/components/icons";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";

export interface Crumb {
  title: string;
  // Omit for a section that has no page of its own.
  href?: string;
}

interface AppHeaderProps {
  title?: string;
  parents?: Crumb[];
}

/** The 64 px topbar: the sidebar toggle and the breadcrumb. */
export function AppHeader({ title, parents }: AppHeaderProps) {
  const { t } = useTranslation();
  const { toggleSidebar } = useSidebar();
  return (
    <header className="flex h-16 shrink-0 items-center gap-3.5 border-b px-4 sm:px-7">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={t("panel.sidebar.toggle")}
        className="grid size-9 shrink-0 place-items-center rounded-[10px] text-muted-foreground transition-colors hover:bg-panel hover:text-foreground"
      >
        <PanelLeftIcon size={18} weight="regular" aria-hidden />
      </button>
      {title && (
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            {(parents ?? []).map((parent) => (
              <Fragment key={parent.title}>
                <BreadcrumbItem className="hidden truncate sm:inline-flex">
                  {parent.href ? (
                    <BreadcrumbLink asChild>
                      <Link to={parent.href}>{parent.title}</Link>
                    </BreadcrumbLink>
                  ) : (
                    parent.title
                  )}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:inline-flex" />
              </Fragment>
            ))}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate text-[15px]">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </header>
  );
}
