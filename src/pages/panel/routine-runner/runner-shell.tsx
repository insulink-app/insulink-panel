import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Full-screen chrome: no sidebar while training, just a way back out.
export function RunnerShell({
  routineId,
  routineName,
  children,
}: {
  routineId?: string;
  routineName?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const backTarget = routineId ? `/health/routines/${routineId}` : "/health/routines";
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/85 px-4 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link to={backTarget} aria-label={t("common.back")}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/health/routines">{t("routines.title")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {routineId && routineName && (
              <>
                <BreadcrumbItem className="hidden sm:block">
                  <BreadcrumbLink asChild>
                    <Link to={`/health/routines/${routineId}`}>{routineName}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{t("routines.start")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6">{children}</div>
    </div>
  );
}
