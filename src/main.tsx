import "./locales/i18n";
import "./global.css";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./routes/components/error-boundary";
import { routesSection } from "./routes/sections";
import userStore from "./store/user-store";

// The demo opens straight into the sample account instead of the login form.
if (import.meta.env.VITE_DEMO === "true" && !userStore.getState().token.authentication_token) {
  userStore.getState().actions.setUserToken({ authentication_token: "demo", refresh_token: "demo" });
  userStore.getState().actions.setUserInformation({ name: "Demo" });
}

const router = createBrowserRouter(
  [
    {
      Component: () => (
        <App>
          <Outlet />
        </App>
      ),
      errorElement: <ErrorBoundary />,
      children: routesSection,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(<RouterProvider router={router} />);
