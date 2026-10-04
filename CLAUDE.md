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
npm run test:e2e  # Playwright smoke tests (e2e/), API mocked via page.route
```

E2E: `e2e/fake-sport-api.ts` serves an in-memory sport account (syncs replace,
finds return it, `state` can be changed to play the phone) and records every
write, so tests assert on what went over the wire. Runner tests freeze time with
`page.clock` (`e2e/runner-page.ts`); sync tests run on a real clock for the 2 s poll.

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

- **Localize everything — no hard-coded user-facing strings.** Every displayed
  string goes through i18next: `const { t } = useTranslation()` then
  `t("key")`. Keys live in `src/locales/lang/en_US/en_US.json` and
  `de_DE/de_DE.json` (nested objects, `snake_case` keys); add to **both**.
  **English (`en_US`) is the default and fallback language.** Interpolate with
  `{{var}}` (e.g. `t("devices.days", { n })`) — don't build display strings by
  concatenating literals. Module-scope constants (column arrays, label maps)
  can't call the reactive `t`, so build them **inside** the component; the one
  non-hook exception is `sensor-service.ts`, which imports the shared `t` from
  `@/locales/i18n`.
- **No dash as punctuation in a user-facing string** — no `—`, no `–`, no ` - `.
  Use a comma, a colon or a full stop instead; a hyphen inside a word is fine
  (`CGM-Daten`). `npx tsx src/locales/punctuation.check.ts` fails on one.
- **Never key state/routing off a translated string** — switching language
  would change it and break the match. Use a stable, language-independent `id`
  and resolve the display label with `t()` (see `settings-dialog.tsx`: each
  category has an `id` like `"glucose"`, shown via `t("settings.section_" + id)`).
  Keep the two locale JSONs at **key parity** — every key must exist in both.
- Data fetching in pages: `useQuery` with a stable `queryKey`. Settings is
  shared under `queryKey: ["settings"]`.
- Tables/lists: reuse `DataList` from `@/components/data-list` (`title`,
  `columns`, `data`, `isLoading`, `pageSize`). Columns are
  `ListColumn<T>[]` (`{ header, cell }`).
- Glucose logic: `src/lib/glucose.ts` — `classify`, `statusColorVar`,
  `toDisplay`, `unitLabel`. Values are **mg/dL** everywhere; mmol/L is
  display-only (÷18).
- Device runtime maths: `src/lib/sensor.ts` and `src/lib/pump.ts`, each with a
  `*.check.ts` self-check (`npx tsx src/lib/pump.check.ts`). Both exist because
  `registered_at` is when the app POSTed, not when the device started — the real
  start lives in the blob. `pump.ts` deliberately does NOT declare
  `long_term_key` in its blob type: it authorises delivering insulin, so nothing
  here should be able to render it.
- Theme: `src/global.css` mirrors the app (indigo brand, `#FAFAFA`/`#1B1B1B`
  surfaces, 14px radius) plus `--glucose-in-range/low/high` vars. Brand assets
  in `public/` (`icon.png`, `logo-black.png`, `logo-white.png` — swap
  black/white by theme).

## Code style (follow these — they override default habits)

Adapted from the mobile app's conventions:

- **All code comments in English.** Every comment (`//`, `/* */`, JSDoc) is
  English — no German. If you touch a file with a German comment, translate it.
- **No one-line `if`s.** Always use braces, even for a single statement.
- **Descriptive, unique names.** No generic or duplicated names, and **no
  one-letter variables** (loop/callback params included) — the name says what it
  holds.
- **Short functions and files.** One job each; split them when they grow. Treat
  a long component/file as a smell, not a hard limit.
- **Avoid boilerplate.** No scaffolding "for later", no copy-pasted patterns a
  shared helper/component removes — extract the repetition.
- **2-space indentation.**
- **Localize everything** (see Conventions above).

## Timestamp gotcha

All timestamps are epoch **milliseconds** — pass straight to `new Date()`.
Glucose `time` is minute-aligned epoch ms (see the app's `glucose_sync.dart`);
it just carries no sub-minute precision, so don't multiply it by 1000.

Each service file notes its unit — check before formatting with `date-fns`.

## The route map

`src/components/route-map.tsx` draws a training route on **Esri's Gray Canvas**
basemaps (no API key): two tile layers, map then place names, light or dark by
theme, capped at `maxNativeZoom: 16` because Esri serves a "Map data not yet
available" placeholder past it. In dark mode only the BASE layer is dimmed
(`brightness(0.55)`), so the place names keep their brightness. It mirrors the app's `cardio_map.dart` on
purpose, so change both together. Why this provider and not a keyed one (and
what CARTO's tiles look like now): the app's `docs/MAP.md`.

## Adding a page

1. New service in `src/api/services/` (mirror an existing one).
2. Add the page's strings to both locale JSONs (`en_US` + `de_DE`).
3. New folder `src/pages/panel/<name>/index.tsx`, default-export a component
   wrapped in `<PanelPage title={t("<name>.title")}>`.
4. Register the route in `routes/sections/panel/panel.tsx`.
5. Add a nav entry (with a `t("nav.<name>")` title) in `AppNavigation()` in
   `app-sidebar.tsx`, and its `nav.*` key to both locale JSONs.
