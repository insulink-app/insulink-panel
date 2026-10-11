import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Maximize } from "@/components/icons";
import L from "leaflet";
import { Button } from "@/components/ui/button";

// Esri's Gray Canvas basemaps, the same tiles the app uses (no API key): a quiet
// grey map with a real dark counterpart. CartoDB's Positron/Dark Matter were
// used until CARTO started stamping "API KEY REQUIRED" across every tile.
// A style is two layers here — the map, then the place names over it.
const ESRI = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas";
const TILES = {
  light: {
    base: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
  dark: {
    base: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
};
// The deepest zoom Esri draws. Past it the service answers with a placeholder
// tile reading "Map data not yet available", so Leaflet must scale the z16 tile
// up instead of asking for one that does not exist.
const MAX_NATIVE_ZOOM = 16;
// Esri's dark canvas is a mid grey that glows against the panel's much darker
// page. Dimming only the BASE layer is what the two-layer split buys us: the
// place names on top keep their brightness. Mirrors the app's `_darkDim`.
const DARK_DIM = "brightness(0.55)";

type LatLng = { lat: number; lng: number };

// The start is a small light dot ringed in the page colour; the finish is the
// only real marker, a light circle with a dark flag. No coloured pins. Inlined
// as markup because Leaflet takes an HTML string, not a component, which also
// lets the theme tokens apply directly.
// Breathing room so the start/finish markers don't sit on the map edge.
const FIT_PADDING: [number, number] = [24, 24];
const FLAG_ICON =
  '<path d="M5 21V4M5 4h11l-2 4 2 4H5" />';

function startIcon(label: string) {
  return L.divIcon({
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html:
      `<div aria-label="${label}" style="width:14px;height:14px;border-radius:9999px;` +
      `background:var(--text);border:3px solid var(--ground);box-sizing:border-box;"></div>`,
  });
}

function finishIcon(label: string) {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html:
      `<div aria-label="${label}" style="width:30px;height:30px;border-radius:9999px;` +
      `background:var(--text);color:var(--ground);` +
      `display:flex;align-items:center;justify-content:center;box-sizing:border-box;">` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"` +
      ` fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"` +
      ` stroke-linejoin="round">${FLAG_ICON}</svg></div>`,
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
  const tileRef = useRef<L.LayerGroup | null>(null);
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
      getComputedStyle(document.documentElement).getPropertyValue("--brand").trim() ||
      "#9daeff";

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;
    // A pane above the marker badges (markerPane is z-index 600) so the hover dot
    // is never swallowed by the start/finish icons when it passes over them.
    map.createPane("highlight");
    map.getPane("highlight")!.style.zIndex = "620";

    const line = L.polyline(points, { color: primary, weight: 4, lineCap: "round", lineJoin: "round" }).addTo(map);
    if (points.length >= 2) {
      L.marker(points[0], { icon: startIcon(startLabel) }).addTo(map);
      L.marker(points[points.length - 1], {
        icon: finishIcon(finishLabel),
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
    const isDark = resolvedTheme === "dark";
    const style = isDark ? TILES.dark : TILES.light;
    const options = { maxNativeZoom: MAX_NATIVE_ZOOM };
    const base = L.tileLayer(style.base, options);
    // One group so both layers are removed together on the next theme swap.
    tileRef.current = L.layerGroup([
      base,
      L.tileLayer(style.labels, options),
    ]).addTo(map);
    base.getContainer()!.style.filter = isDark ? DARK_DIM : "";
  }, [resolvedTheme, points.length]);

  if (points.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-80 w-full overflow-hidden rounded-3xl border z-0"
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
        className="absolute right-3 top-3 z-10"
      >
        <Maximize className="size-4" />
      </Button>
    </div>
  );
}
