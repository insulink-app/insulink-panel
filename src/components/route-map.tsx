import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Maximize } from "@/components/icons";
import L from "leaflet";
import { Button } from "@/components/ui/button";

// CartoDB light/dark basemaps — the same tiles the app uses (no API key).
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

type LatLng = { lat: number; lng: number };

// Round start/finish badges, mirroring the app's `_badgeMarker`: the same muted
// slate for both, told apart by the icon rather than a loud red/green. The icons
// are inlined as markup because Leaflet takes an HTML string, not a component.
const BADGE_COLOR = "#37474F";
// Breathing room so the start/finish badges don't sit on the map edge.
const FIT_PADDING: [number, number] = [24, 24];
const PLAY_ICON = '<polygon points="7 4 19 12 7 20 7 4" fill="currentColor" />';
const FLAG_ICON =
  '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />' +
  '<line x1="4" y1="22" x2="4" y2="15" />';

function badgeIcon(icon: string, label: string) {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html:
      `<div aria-label="${label}" style="width:30px;height:30px;border-radius:9999px;` +
      `background:${BADGE_COLOR};border:2.5px solid #fff;color:#fff;` +
      `display:flex;align-items:center;justify-content:center;box-sizing:border-box;">` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"` +
      ` fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"` +
      ` stroke-linejoin="round">${icon}</svg></div>`,
  });
}

// A tiled map with the recorded GPS route drawn as a polyline and badges on the
// start and finish — mirrors the app's cardio map. `highlight` moves a marker
// along the route (driven by hovering the vitals chart).
export function RouteMap({
  track,
  highlight,
}: {
  track: LatLng[];
  highlight?: LatLng | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const highlightRef = useRef<L.CircleMarker | null>(null);
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const startLabel = t("activity.route_start");
  const finishLabel = t("activity.route_finish");

  // Memoised on `track`: `highlight` changes on every chart hover, and rebuilding
  // (and previously re-serialising) the whole route each time is what made the
  // marker lag behind the cursor.
  const points = useMemo(
    () =>
      track
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .map((point) => [point.lat, point.lng] as [number, number]),
    [track],
  );

  // Frames the whole route again after panning or zooming away — the same fit
  // the map opens with.
  const resetView = useCallback(() => {
    mapRef.current?.fitBounds(L.latLngBounds(points), { padding: FIT_PADDING });
  }, [points]);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) {
      return;
    }
    const primary =
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() ||
      "#4f46e5";

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;
    // A pane above the marker badges (markerPane is z-index 600) so the hover dot
    // is never swallowed by the start/finish icons when it passes over them.
    map.createPane("highlight");
    map.getPane("highlight")!.style.zIndex = "620";

    const line = L.polyline(points, { color: primary, weight: 5 }).addTo(map);
    if (points.length >= 2) {
      L.marker(points[0], { icon: badgeIcon(PLAY_ICON, startLabel) }).addTo(map);
      L.marker(points[points.length - 1], {
        icon: badgeIcon(FLAG_ICON, finishLabel),
        // Above the start badge where a loop run ends where it began.
        zIndexOffset: 1000,
      }).addTo(map);
    }
    map.fitBounds(line.getBounds(), { padding: FIT_PADDING });

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      highlightRef.current = null;
    };
    // Rebuild only when the route (or the badge labels) change; theme swaps the
    // tile layer below. `points` is memoised on `track`, so its identity is a
    // sound dep — no need to serialise the route to compare it.
  }, [points, startLabel, finishLabel]);

  // Move (or clear) the hover marker without rebuilding the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (!highlight) {
      highlightRef.current?.remove();
      highlightRef.current = null;
      return;
    }
    // The hover marker reads as a neutral point, not a series colour: white on
    // dark, black on light, ringed by its opposite so it stays visible.
    const isDark = resolvedTheme === "dark";
    const markerFill = isDark ? "#ffffff" : "#000000";
    const markerStroke = isDark ? "#000000" : "#ffffff";
    const position: [number, number] = [highlight.lat, highlight.lng];
    if (highlightRef.current) {
      highlightRef.current.setLatLng(position);
      highlightRef.current.setStyle({ color: markerStroke, fillColor: markerFill });
    } else {
      highlightRef.current = L.circleMarker(position, {
        radius: 8,
        color: markerStroke,
        weight: 2,
        fillColor: markerFill,
        fillOpacity: 1,
        // Its own SVG renderer in the "highlight" pane (above markerPane), so the
        // dot always sits on top of the start/finish badges, not just the route.
        renderer: L.svg({ pane: "highlight" }),
      }).addTo(map);
    }
  }, [highlight, resolvedTheme]);

  // Swap the tile layer to match the active theme without rebuilding the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (tileRef.current) {
      tileRef.current.remove();
    }
    tileRef.current = L.tileLayer(
      resolvedTheme === "dark" ? TILES.dark : TILES.light,
      { subdomains: ["a", "b", "c", "d"], detectRetina: true },
    ).addTo(map);
  }, [resolvedTheme, points.length]);

  if (points.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-80 w-full overflow-hidden rounded-xl z-0"
      />
      {/* A sibling of the map rather than an L.Control: clicks never reach the
          map, and it stays a plain themed button. Leaflet's panes are boxed in
          by the map container's own z-0 stacking context. */}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={resetView}
        title={t("activity.route_reset")}
        aria-label={t("activity.route_reset")}
        className="absolute right-3 top-3 z-10 shadow-md"
      >
        <Maximize className="size-4" />
      </Button>
    </div>
  );
}
