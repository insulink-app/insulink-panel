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

export default { meals, drinks, products };
