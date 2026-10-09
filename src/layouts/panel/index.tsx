import { AppSidebar, SidebarInset, SidebarProvider } from "./sidebar";
import { AppHeader, type Crumb } from "./header";

interface PanelPageProps {
  title?: string;
  parents?: Crumb[];
  /**
   * "full" is the workout runner: the whole width, with the sidebar collapsed
   * (the topbar toggle still opens it). Pages use up to 1440 px.
   */
  width?: "default" | "full";
  children?: React.ReactNode;
}

const CONTENT_WIDTH = {
  // 1440 px of content plus the 32 px gutters.
  default: "max-w-[1504px] px-4 py-7 sm:px-8 sm:py-8",
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
