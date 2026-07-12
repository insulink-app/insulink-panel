import { Navigate, Outlet, type RouteObject } from "react-router";
import { Component } from "./component";
import LoginAuthGuard from "@/routes/components/login-auth-guard.tsx";
import SimpleLayout from "@/layouts/simple";
import { Suspense } from "react";
import { LineLoading } from "@/components/loading";

const getRoutes = (): RouteObject[] => {
  return [
    { path: "overview", element: Component("/pages/panel/overview") },
    { path: "glucose", element: Component("/pages/panel/glucose") },
    { path: "nutrition", element: <Navigate to="/nutrition/meals" replace /> },
    { path: "nutrition/:view", element: Component("/pages/panel/nutrition") },
    { path: "health", element: <Navigate to="/health/workouts" replace /> },
    { path: "health/:view", element: Component("/pages/panel/health") },
    { path: "devices", element: <Navigate to="/devices/sensor" replace /> },
    { path: "devices/:view", element: Component("/pages/panel/devices") },
  ];
};

export const panelRoutes: RouteObject[] = [
  {
    element: (
      <LoginAuthGuard>
        <SimpleLayout>
          <Suspense fallback={<LineLoading />}>
            <Outlet />
          </Suspense>
        </SimpleLayout>
      </LoginAuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/overview/" replace />,
      },
      ...getRoutes(),
    ],
  },
];
