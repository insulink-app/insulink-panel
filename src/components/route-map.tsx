import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// CartoDB light/dark basemaps — the same tiles the app uses (no API key).
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

type LatLng = { lat: number; lng: number };

// A tiled map with the recorded GPS route drawn as a polyline and a dot on the
// finish — mirrors the app's cardio map. `highlight` moves a marker along the
// route (driven by hovering the vitals chart).
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

  const points = track
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .map((point) => [point.lat, point.lng] as [number, number]);

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

    const line = L.polyline(points, { color: primary, weight: 5 }).addTo(map);
    L.circleMarker(points[points.length - 1], {
      radius: 7,
      color: primary,
      fillColor: primary,
      fillOpacity: 1,
    }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [24, 24] });

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      highlightRef.current = null;
    };
    // Rebuild only when the route changes; theme swaps the tile layer below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);

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
    const position: [number, number] = [highlight.lat, highlight.lng];
    if (highlightRef.current) {
      highlightRef.current.setLatLng(position);
    } else {
      highlightRef.current = L.circleMarker(position, {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: "#e0533d",
        fillOpacity: 1,
      }).addTo(map);
    }
  }, [highlight]);

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
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-xl z-0"
    />
  );
}
