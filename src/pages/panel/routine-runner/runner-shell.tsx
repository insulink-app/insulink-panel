import { useTranslation } from "react-i18next";
import PanelPage from "@/layouts/panel";

/**
 * The runner's chrome: the panel shell over the whole width with the sidebar
 * tucked away, and the breadcrumb Routines › routine › Start as the way out.
 */
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
  const parents = [{ title: t("routines.title"), href: "/health/routines" }];
  if (routineId && routineName) {
    parents.push({ title: routineName, href: `/health/routines/${routineId}` });
  }
  return (
    <PanelPage title={t("routines.start")} parents={parents} width="full">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </PanelPage>
  );
}
