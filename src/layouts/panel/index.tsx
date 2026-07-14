import { AppSidebar, SidebarInset, SidebarProvider } from "./sidebar";
import { AppHeader, type Crumb } from "./header";

interface PanelPageProps {
  title?: string;
  parents?: Crumb[];
  layout?: boolean;
  children?: React.ReactNode;
}

export default function PanelPage({
  title,
  parents,
  layout,
  children,
}: PanelPageProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title={title} parents={parents} />
        <div
          className={
            layout == false
              ? ""
              : "w-[min(1500px,95%)] mx-auto flex flex-col flex-1"
          }
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
