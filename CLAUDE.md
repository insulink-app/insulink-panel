# CLAUDE.md

Guidance for working in this repo.

## What this is

Insulink Panel — a web companion for the Insulink diabetes/CGM app. It is a
**self-service** SPA: a user logs in with their app credentials and views/edits
**their own** data. There is no admin/multi-user concept — the backend API
scopes every endpoint to the caller's own `user_id` via the JWT.

Sibling projects (context, not part of this repo):
- Backend: `/home/lukas/IdeaProjects/insulink-api` (Java / Spring Boot, `/v1`).
- Mobile app: `/home/lukas/StudioProjects/insulink` (Flutter). Its `*_sync.dart`
  files are the source of truth for the API contract; match them.

This panel was scaffolded from a generic dashboard template; the
auth/API/routing/layout shell was kept and all domain content is Insulink's.

## Stack

React 19 + Vite 8, TypeScript (strict), React Router v7, TanStack Query +
Axios, Zustand (persisted auth), shadcn/ui over Radix + Tailwind v4, Recharts,
Sonner toasts. Path alias `@/` → `src/`.

## Run

```bash
npm run dev     # http://localhost:5173
npm run build   # tsc -b && vite build
```

`VITE_API_BASE_URL` (`.env`, default `https://insulink.lukasbreuer.de/v1/`) is
the API base. **CORS:** the panel origin must be in the backend `config.ini`
`[web] allowed_origins`, or login fails at the browser.

## Architecture

- `src/api/client.ts` — Axios wrapper. Response interceptor unwraps
  `response.data`. Auth: injects `Authorization: Bearer`; on **417** refreshes
  the token (single-flight queue) and retries; on **403** clears the session.
  These status codes are Insulink-specific — don't change them to 401.
- `src/api/services/*.ts` — one file per domain area: typed request/response +
  thin `client.get/post` calls. Read endpoints are the `find/history/current`
  ones; the panel only writes settings and account (name/password). The app
  owns the offline `sync` (full-replace) writes — don't add them here.
- `src/store/user-store.ts` — auth token (cookie `user`) + refresh token
  (cookie `user-refresh`) + user `information` (just `name`). `useLogin` /
  `useLogout` / `useUserToken` / `useUserActions`. A non-hook `userStore.getState()`
  lets `client.ts` read/write tokens outside React.
- `src/routes/sections/panel/panel.tsx` — panel routes. Pages are lazy-loaded
  by path string via `Component("/pages/panel/<x>")` (see `sections/panel/component.tsx`,
  which globs `/src/pages/**/*.tsx`). Index redirects to `/overview/`.
  `LoginAuthGuard` gates all panel routes.
- `src/layouts/panel/index.tsx` (`PanelPage`) — the sidebar+header shell. **Each
  page wraps its own content in `<PanelPage title="…">`.**
- `src/layouts/panel/sidebar/app-sidebar.tsx` — nav items live in `AppNavigation()`.

## Conventions

- **UI language is German**, hardcoded in pages. i18n (`src/locales`) is only
  still used by leftover shell bits (theme/language selector, DataTable, error
  pages); its JSON holds just those keys. Don't reintroduce translation keys for
  new pages — write German literals.
- Data fetching in pages: `useQuery` with a stable `queryKey`. Settings is
  shared under `queryKey: ["settings"]`.
- Tables: reuse `DataTable` from `@/components/table` (`name`, `columns`,
  `data`, `isLoading`). Columns are TanStack `ColumnDef<T, unknown>[]`.
- Glucose logic: `src/lib/glucose.ts` — `classify`, `statusColorVar`,
  `toDisplay`, `unitLabel`. Values are **mg/dL** everywhere; mmol/L is
  display-only (÷18).
- Theme: `src/global.css` mirrors the app (indigo brand, `#FAFAFA`/`#1B1B1B`
  surfaces, 14px radius) plus `--glucose-in-range/low/high` vars. Brand assets
  in `public/` (`icon.png`, `logo-black.png`, `logo-white.png` — swap
  black/white by theme).

## Timestamp gotcha

Timestamps are inconsistent across endpoints (matching the app):
- **Glucose `time` is epoch SECONDS** → multiply by 1000 for `Date`.
- Events, meals, drinks, sport, health, pulse are epoch **milliseconds**.

Each service file notes its unit — check before formatting with `date-fns`.

## Adding a page

1. New service in `src/api/services/` (mirror an existing one).
2. New folder `src/pages/panel/<name>/index.tsx`, default-export a component
   wrapped in `<PanelPage title="…">`.
3. Register the route in `routes/sections/panel/panel.tsx`.
4. Add a nav entry in `AppNavigation()` in `app-sidebar.tsx`.
