# Insulink Web-Panel – Redesign

Ziel: panel.insulink.de optisch an die neue App angleichen. Funktionen, Routen, Daten und die deutschen Texte bleiben gleich – nur das Design ändert sich. Referenzbreite 1600 px (Training 1920 px); Inhalt max. 1440 px, Seitenabstand 32 px.

Referenz: `screens/panel-overview.png`, `screens/panel-workout.png` (1440 px breit), Markup in `reference/*.dc.html` (Inline-Styles = exakte Maße).

## Tokens (identisch zur App)

| Token | Wert | Verwendung |
|---|---|---|
| ground | `#0F1B26` | Seitenhintergrund |
| sidebar | `#0C1620` | Sidebar |
| panel | `#152432` | Karten |
| panelRaised | `#1A2C3D` / `#1E3042` | Stat-Kacheln, Sekundär-Buttons, aktives Listenelement |
| line | `rgba(234,241,246,0.06)` | Ränder, Trennlinien |
| text | `#EAF1F6` | |
| muted | `#97A9BA` | Labels, Untertitel |
| accent | `#9DAEFF` | Primär-Button, aktiver Range-Chip, Logo |
| accentText | `#C4CEFF` | aktiver Nav-Eintrag |
| range | `#7CCB8F` | Im Zielbereich, Glukose-Sparkline |
| high | `#F4B740` | Hoch |
| low | `#FF6B7F` | Niedrig |
| pulse | `#C9A7FF` | Puls |
| bolus/2. Serie | `#2ED8B6` | |

Schrift: Atkinson Hyperlegible Next, `font-variant-numeric: tabular-nums`. Zahlen deutsch formatiert (86,5 g · 2.654).

## Layout

- **Sidebar** 236 px, gleicher Hintergrund wie die Seite (`ground`), nur rechte Linie. Logo 28 px (Radius 9) + „Insulink“.
  - Kein Glukose-Widget in der Sidebar; direkt unter dem Logo beginnt die Navigation.
  - Gruppen-Labels 12 px `#62778B`, normale Schreibweise. Items 34 px, Radius 10, Icon 17 px `#7C90A3`, Text `#A9B9C8`.
  - Aktiv: Fläche `panel`, Text weiß + fett, Icon in accent.
  - Sensor und Pump haben rechts einen grünen Statuspunkt (verbunden), grau, wenn getrennt.
  - Unten: Export, Trennlinie, User-Zeile (Avatar, Name, Zahnrad → Settings). Settings ist kein eigener Nav-Eintrag mehr.
  - Unter 900 px ausgeblendet.
- **Topbar** 64 px, Sidebar-Toggle + Breadcrumb (letztes Element fett/weiß), untere Linie.
- **Inhalt** Padding 28 px, Karten-Gap 16 px, Karten Radius 24, Padding 24, `panel` + 1 px Linie. Keine Boxen in Boxen außer Stat-Kacheln.

## Seiten (Details: MASTER_PROMPT.md, Abschnitt 6)

| Seite | Screenshot | Aufbau |
|---|---|---|
| Übersicht | PanelOverview.png | Glukose-Karte (Kopf in einer Zeile) + TIR · Ernährung/Sport heute mit Tagesleiste |
| Glukose | PanelGlukose.png | Wert + KPI-Leiste offen · Chart-Karte mit Navigation · Messungen + TIR/Sensor |
| Ereignisse | PanelEreignisse.png | KPI-Leiste = Legende · gestapelte Balken · Protokoll + Tiefs nach Uhrzeit |
| Routinen | PanelRoutinen.png | 3er-Kartenraster mit Play · Letzte Trainings + Trainings/Woche |
| Übungen | PanelUebungen.png | Master-Detail: Liste mit Suche · Detail mit KPIs, Verlauf, Routinen |
| Übungsstatistiken | PanelStatistiken.png | KPI-Leiste · 2 Charts · Tabelle mit Inline-Balken |
| Aktivität | PanelAktivitaet.png | Verlauf mit Tagesgruppen · Diese Woche + Kalender-Heatmap |
| Puls | PanelPuls.png | wie Glukose, violett · Zonen + Ruhepuls 7 Tage |
| Schlaf | PanelSchlaf.png | Hypnogramm-Karte + Nacht-Details · Schlafdauer + Nächte |
| Körper | PanelKoerper.png | Chart (Messwerte + Ø 7 Tage) · Kennwerte + Messungen |
| Training | PanelWorkout.png | siehe unten |

## Workout-Runner (Routines › Normale Routine › Start)

Offenes Layout ohne Karten. Struktur wird nur über Linien und Abstände gebildet.

- **Kopf:** Links Routinenname 26 px, darunter muted „1 / 11 Übungen · 0 / 20 Sätze“. Rechts Pause (runder Icon-Button) und Finish.
- **Zeitleiste (wie bei einem Player):** eine Zeile mit links nur „**0:01**“, in der Mitte dem Fortschrittsbalken (8 px, ein Segment pro Übung, Breite proportional zur Satzanzahl, aktuelles Segment anteilig in accent) und rechts „endet **19:45**“. Die Werte sind 16 px weiß.
- Referenzgröße 1920 × 1080 (großer Bildschirm), Inhalt max. 1640 px.
- **Darunter 3 Spalten, symmetrisch** (`340px 1fr 340px`, füllen die Höhe; die Trennlinien laufen bis unten, die Bühne ist vertikal zentriert): Die Timer-Bühne steht dadurch **exakt in der Mitte** des Inhaltsbereichs. Das ist wichtig: Beide Seitenspalten müssen immer gleich breit bleiben.
  - **Links – Vitals** (rechte Linie, keine Karte): Glukose und Puls untereinander, jeweils Label, Wert 40 px, Sparkline über die volle Spaltenbreite (durchgehend). Keine Meta-Zeile.
  - **Mitte – Bühne**, zentriert: „Set 1 of 1“ in accentText, Übungsname 52 px, Timer 176 px, „Last time: 1 rep“, Reps-Stepper (52 px Kreise, Wert 44 px), „Set done“ (max. 420 px, 58 px hoch).
  - **Rechts – Exercises** (linke Linie, keine Fläche):
    - Die aktuelle Übung hat einen 3 px accent-Balken links, Name 15 px, „1 set · 1 rep“ und die Pill-Buttons Skip / Swap (panel).
    - Danach Zeilen mit Nummer (muted), Name fett und „2 sets · 35 reps“ rechtsbündig, getrennt durch Trennlinien.
- Unter 1300 px werden die Spalten untereinander gestapelt.

## Regeln
- Karten in einer Reihe immer gleich hoch/gleich breit, 16 px Abstand.
- Charts durchgehend, keine Einzelpunkte, Prognose grau.
- Keine Tags/Pills über Überschriften.
- Statusfarben nur für Glukosebereiche, nicht dekorativ.
