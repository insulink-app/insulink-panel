import { useEffect, useState } from "react";

// Resolve the themed glucose colours from CSS vars, re-reading whenever the
// theme (class/data-theme/style on <html>) changes so the chart restains live.
export function useGlucoseHex() {
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      low: style.getPropertyValue("--glucose-low").trim() || "#e0533d",
      "in-range": style.getPropertyValue("--glucose-in-range").trim() || "#2e9e5b",
      high: style.getPropertyValue("--glucose-high").trim() || "#e8a13a",
    } as Record<string, string>;
  };
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    return () => observer.disconnect();
  }, []);
  return colors;
}
