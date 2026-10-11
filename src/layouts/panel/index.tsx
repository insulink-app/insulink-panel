import { AppSidebar, SidebarInset, SidebarProvider } from "./sidebar";
import { AppHeader, type Crumb } from "./header";

interface PanelPageProps {
  title?: string;
  parents?: Crumb[];
  /**
   * "full" is the workout runner: the whole width, with the sidebar collapsed
   * (the topbar toggle still opens it) and no cap, so it fills any screen.
   * Pages cap their content at 1760 px.
   */
  width?: "default" | "full";
  children?: React.ReactNode;
}

const CONTENT_WIDTH = {
  // 1760 px of content plus the 40 px gutters, the 1920 px reference.
  default: "max-w-[1840px] px-4 py-7 sm:px-10 sm:pt-9 sm:pb-10",
  full: "max-w-none px-4 pt-4 pb-7 sm:px-7 xl:px-10 xl:pb-9",
};

export default function PanelPage({
  title,
  parents,
  width = "default",
  children,
}: PanelPageProps) {
  return (
    <SidebarProvider defaultOpen={width !== "full"}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <AppHeader title={title} parents={parents} />
        <div className={`mx-auto flex w-full min-w-0 flex-1 flex-col ${CONTENT_WIDTH[width]}`}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
