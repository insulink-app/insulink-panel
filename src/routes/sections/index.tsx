import { Navigate, type RouteObject } from "react-router-dom";
import { authenticationRoutes } from "./authentication";
import { panelRoutes } from "./panel/panel.tsx";
import { mainRoutes } from "./main";

export const routesSection: RouteObject[] = [
  ...authenticationRoutes,
  ...panelRoutes,
  ...mainRoutes,
  { path: "*", element: <Navigate to="/404/" replace /> },
];
