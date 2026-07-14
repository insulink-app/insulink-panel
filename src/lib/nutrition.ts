// Nutrition display helpers. Carbs/protein are grams, drinks millilitres.

// The drink presets the app logs (see its nutrition_models.dart); anything else
// was a free-amount entry.
const DRINK_KINDS = ["glass", "small_bottle", "sodastream", "large_bottle"];

/** A stored drink's preset, or "free" for a free-amount/unknown entry. */
export const drinkKind = (kind?: string) =>
  kind && DRINK_KINDS.includes(kind) ? kind : "free";

/** A number without a trailing ".0" (42, 4.5). */
export const formatAmount = (value: number) =>
  value % 1 === 0 ? String(value) : value.toFixed(1);

/** `formatAmount` with its unit appended; "–" when the value is missing. */
export const withUnit = (value: number | undefined, unit: string) =>
  value == null ? "–" : `${formatAmount(value)} ${unit}`;
