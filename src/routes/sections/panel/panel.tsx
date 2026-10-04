import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import { Component } from "./component";
import LoginAuthGuard from "@/routes/components/login-auth-guard.tsx";
import SimpleLayout from "@/layouts/simple";
import { Suspense } from "react";
import { LineLoading } from "@/components/loading";

const getRoutes = (): RouteObject[] => {
  return [
    { path: "overview", element: Component("/pages/panel/overview") },
    { path: "glucose", element: Component("/pages/panel/glucose") },
    { path: "events", element: Component("/pages/panel/events") },
    { path: "nutrition", element: <Navigate to="/nutrition/meals" replace /> },
    { path: "nutrition/:view", element: Component("/pages/panel/nutrition") },
    { path: "nutrition/meals/:time", element: Component("/pages/panel/meal-detail") },
    { path: "health", element: <Navigate to="/health/activity" replace /> },
    { path: "health/activity", element: Component("/pages/panel/activity") },
    { path: "health/activity/:kind/:id", element: Component("/pages/panel/activity-detail") },
    { path: "health/routines", element: Component("/pages/panel/routines") },
    { path: "health/routines/exercises", element: Component("/pages/panel/exercises") },
    { path: "health/routines/stats", element: Component("/pages/panel/exercise-stats") },
    { path: "health/routines/new", element: Component("/pages/panel/routine-editor") },
    { path: "health/routines/:id", element: Component("/pages/panel/routine-detail") },
    { path: "health/routines/:id/edit", element: Component("/pages/panel/routine-editor") },
    { path: "health/routines/:id/run", element: Component("/pages/panel/routine-runner") },
    { path: "health/pulse", element: Component("/pages/panel/pulse") },
    { path: "health/sleep", element: Component("/pages/panel/sleep") },
    { path: "health/body", element: Component("/pages/panel/body") },
    { path: "devices", element: <Navigate to="/devices/sensor" replace /> },
    { path: "devices/sensor/:id", element: Component("/pages/panel/sensor-detail") },
    { path: "devices/:view", element: Component("/pages/panel/devices") },
    { path: "export", element: Component("/pages/panel/export") },
    { path: "settings", element: <Navigate to="/settings/glucose" replace /> },
    { path: "settings/basal", element: Component("/pages/panel/basal") },
    { path: "settings/basal/:index", element: Component("/pages/panel/basal-editor") },
    { path: "settings/:view", element: Component("/pages/panel/settings") },
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
