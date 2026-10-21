import client from "../client";

// /inventory/items/find/ -> { success, items: [...] }. Supply items (pods,
// sensors, insulin) with their expected deliveries; `at` is epoch ms. Only the
// export reads it, so the item is passed through untyped.
const items = () =>
  client.get<{ success: boolean; items?: Record<string, unknown>[] }>({
    url: "/inventory/items/find/",
  });

export default { items };
