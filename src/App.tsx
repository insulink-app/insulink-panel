import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Toaster } from "@/components/ui/sonner";
import { MotionLazy } from "./components/animate/motion-lazy";
import { RouteLoading } from "./components/loading";
import { ThemeProvider } from "next-themes";

if (import.meta.env.DEV) {
  import("react-scan").then(({ scan }) => {
    scan({
      enabled: false,
      showToolbar: true,
      log: false,
      animationSpeed: "fast",
    });
  });
}

// Module scope, not inline in the JSX: a client built during render is a new
// client on every re-render, which throws away the cache and restarts every
// poll timer.
const queryClient = new QueryClient();

function App({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Helmet>
          <link rel="icon" type="image/png" href="/icon.png" />
          <title>Insulink</title>
        </Helmet>
        <RouteLoading />
        <Toaster />
        <MotionLazy>{children}</MotionLazy>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
