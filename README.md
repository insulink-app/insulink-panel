# Insulink Panel

Der browserbasierte Begleiter zur **Insulink**-App – einem Diabetes-/CGM-Tracker.
Nutzer melden sich mit ihren App-Zugangsdaten an und sehen bzw. verwalten ihre
**eigenen** Daten. Das Panel ist self-service: es gibt keine Admin-/Mehrbenutzer-
Rolle – jeder Endpunkt ist per JWT auf den eigenen Account beschränkt.

Es spricht dieselbe `/v1`-REST-API wie die mobile App (Bearer-Token,
`{ success: bool }`-Envelope, Refresh bei `417`, Logout bei `403`).

## Funktionen

- **Übersicht** – aktueller Glukosewert (farbcodiert), Zeit im Zielbereich,
  Sensor-Restlaufzeit und Verlaufs-Chart.
- **Glukose** – Verlauf, Statistik (Ø / Min / Max / TIR) und Messtabelle.
- **Ernährung** – Mahlzeiten, Getränke und Produkte.
- **Sport & Gesundheit** – Workouts, Cardio, Messungen, Health-Tage und Puls.
- **Einstellungen** – Glukose-Einheit, Zielbereiche und Benachrichtigungen.
- **Account** – Benutzername und Passwort ändern.

## Tech-Stack

React 19 · Vite 8 · TypeScript · React Router 7 · TanStack Query + Axios ·
Zustand · Tailwind CSS 4 mit shadcn/ui · Recharts · i18next.

## Entwicklung

```bash
npm install
npm run dev      # Vite-Dev-Server auf http://localhost:5173
npm run build    # tsc -b && vite build
npm run preview  # Produktionsbuild lokal ansehen
npm run lint
```

### Konfiguration

Die API-Basis-URL kommt aus `VITE_API_BASE_URL` (`.env`):

```
VITE_API_BASE_URL=https://insulink.lukasbreuer.de/v1/
```

Für ein lokales Backend stattdessen `http://localhost:8080/v1/` eintragen.

> **CORS:** Der Login schlägt im Browser fehl, solange die Origin des Panels
> (z. B. `http://localhost:5173`) nicht backend-seitig in `config.ini` unter
> `[web] allowed_origins` freigeschaltet ist.

## Deployment

Enthält `Dockerfile` + `nginx.conf`: der Build wird von nginx auf Port **8081**
ausgeliefert, `/v1/` wird an das Backend (`CORE_URL`, Default
`http://localhost:8080`) weitergereicht.

```bash
docker build -t insulink-panel .
docker run -p 8081:8081 -e CORE_URL=https://insulink.lukasbreuer.de insulink-panel
```

## Projektstruktur

```
src/
  api/client.ts        Axios-Wrapper (Auth-Header, Token-Refresh)
  api/services/        ein Service je Domäne (glucose, nutrition, sport, …)
  store/user-store.ts  Auth-/Token-State (Zustand, in Cookies persistiert)
  routes/              Router + Auth-Guard + Lazy-Page-Loader
  layouts/panel/       Sidebar-/Header-Shell (PanelPage)
  pages/panel/         die Seiten (overview, glucose, nutrition, health, …)
  lib/glucose.ts       Glukose-Klassifizierung, Farben, Einheiten
  global.css           Theme-Tokens (Indigo, an die App angelehnt)
```

Architektur, Konventionen und die **Zeitstempel-Falle** (Glukose in Sekunden,
Rest in Millisekunden) sind in [CLAUDE.md](./CLAUDE.md) dokumentiert.
