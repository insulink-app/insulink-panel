import client from "../client";

// All `find` endpoints are read-only; the app owns the write/sync path.
export interface Meal {
  time: number; // epoch ms
  carbs?: number;
  glucose?: number;
  bolus?: number;
  entries?: unknown[];
}

export interface Drink {
  at: number; // epoch ms
  ml: number;
  kind?: string;
}

export interface FoodProduct {
  barcode?: string;
  name?: string;
  brand?: string;
  unit?: string;
  serving?: number;
  serving_label?: string;
  carbs?: number;
  fat?: number;
  protein?: number;
  kcal?: number;
}

const meals = () =>
  client.get<{ success: boolean; meals?: Meal[] }>({
    url: "/nutrition/meals/find/",
  });

const drinks = () =>
  client.get<{ success: boolean; drinks?: Drink[] }>({
    url: "/nutrition/drinks/find/",
  });

const products = () =>
  client.get<{ success: boolean; products?: FoodProduct[] }>({
    url: "/nutrition/products/find/",
  });

// Full-replace write. The app owns nutrition sync; the panel appends products
// the same way (read-modify-write on the whole list). ponytail: no per-product
// endpoint exists, so this must send the complete product set every time.
const syncProducts = (products: FoodProduct[]) =>
  client.post<{ success: boolean }>({
    url: "/nutrition/products/sync/",
    data: { products },
  });

// Open Food Facts full-text search — public, no API key. Called with plain
// `fetch` (NOT the app `client`) so our JWT is never sent to a third party.
// Ported from the mobile app's OffClient: cgi/search.pl is the only endpoint
// that actually ranks by relevance; entries without a name are dropped.
const OFF_FIELDS =
  "code,product_name,brands,quantity,serving_size,serving_quantity," +
  "serving_quantity_unit,nutriments";

const searchProducts = async (terms: string): Promise<FoodProduct[]> => {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.search = new URLSearchParams({
    search_terms: terms,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    fields: OFF_FIELDS,
  }).toString();
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as { products?: unknown };
  const entries = Array.isArray(body.products) ? body.products : [];
  return entries
    .map((entry) => parseOffProduct(entry as Record<string, unknown>))
    .filter((product): product is FoodProduct => !!product.name);
};

const grams = (value: unknown): number =>
  typeof value === "number" ? value : 0;

const offBrand = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string").join(", ").trim();
  }
  return "";
};

// 'ml' for drinks, 'g' for solids — trust OFF's explicit unit, else infer from
// the quantity/serving text mentioning a volume unit.
const offUnit = (product: Record<string, unknown>): string => {
  const explicit = String(product.serving_quantity_unit ?? "").toLowerCase();
  if (explicit === "ml" || explicit === "g") {
    return explicit;
  }
  const text = `${product.quantity ?? ""} ${product.serving_size ?? ""}`.toLowerCase();
  return /\d\s*(ml|cl|l|litre|liter)\b/.test(text) ? "ml" : "g";
};

const parseOffProduct = (product: Record<string, unknown>): FoodProduct => {
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const servingQuantity = product.serving_quantity;
  return {
    barcode: typeof product.code === "string" ? product.code : "",
    name: typeof product.product_name === "string" ? product.product_name.trim() : "",
    brand: offBrand(product.brands),
    unit: offUnit(product),
    serving: typeof servingQuantity === "number" ? servingQuantity : undefined,
    serving_label: String(product.serving_size ?? "").trim(),
    carbs: grams(nutriments["carbohydrates_100g"]),
    fat: grams(nutriments["fat_100g"]),
    protein: grams(nutriments["proteins_100g"]),
    kcal: grams(nutriments["energy-kcal_100g"]),
  };
};

export default { meals, drinks, products, syncProducts, searchProducts };
