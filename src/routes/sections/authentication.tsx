import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const LoginPage = lazy(() => import("@/pages/authentication/login"));
export const authenticationRoutes: RouteObject[] = [
  {
    path: "login",
    element: <LoginPage />,
  },
];
