import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IconContext } from "@phosphor-icons/react";
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
        {/* Phosphor's "regular" weight reads thinner/smaller than the lucide
            icons this app replaced; "bold" (~9.4% stroke) matches lucide's
            weight so icons keep their presence at size-4. Call sites still set
            size via className. */}
        <IconContext.Provider value={{ weight: "bold" }}>
          <MotionLazy>{children}</MotionLazy>
        </IconContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
