// Every number the panel shows is German-formatted, whatever the UI language:
// a decimal comma and a dot between thousands (86,5 g · 2.654 steps · 4,51 km).
const formatters = new Map<number, Intl.NumberFormat>();

/** `value` with exactly `digits` decimals, German style. */
export function formatNumber(value: number, digits = 0): string {
  let formatter = formatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(digits, formatter);
  }
  return formatter.format(value);
}

/**
 * Reads a number typed the way [formatNumber] writes it: dots between
 * thousands, a decimal comma. Null when nothing numeric is left.
 */
export function parseNumber(text: string): number | null {
  const plain = text.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (plain === "" || Number.isNaN(Number(plain))) {
    return null;
  }
  return Number(plain);
}
