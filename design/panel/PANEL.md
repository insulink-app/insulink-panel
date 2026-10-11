# Insulink Web-Panel – Redesign

Die vollständige und aktuelle Spezifikation steht in `MASTER_PROMPT.md` im Wurzelverzeichnis des Pakets.

- Screenshots: `screens/Panel*.png` (1920 × 1080, eine Datei pro Seite)
- Exakte Maße: `reference/Panel*.dc.html` (Inline-Styles)

Kurz zusammengefasst:
- Neutrale Graphit-Palette mit den Akzent- und Statusfarben der App.
- Sidebar mit deutlicher Markierung der aktiven Seite; Export und Einstellungen als eigene Punkte unten.
- Für breite Bildschirme gebaut: Inhalt bis 1760 px, alles fluid.
- Karten nebeneinander immer gleich hoch.
- Relative Datumsangaben (Heute, Gestern, Mi., 07.10.).
- Verlaufslisten mit Bereichsskala oder Zeitleiste, die in der Karte endlos weiterscrollen. Kein „Mehr anzeigen“.
- Graphen durchgehend, ohne y-Beschriftung links, Prognose grau, Zielbereich 80–180 mg/dL.
- Dialoge zentriert, die Abdunklung liegt über dem ganzen Bildschirm.
- Sensoren und Pods lassen sich im Panel nicht wechseln.
