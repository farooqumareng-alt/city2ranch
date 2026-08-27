import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { commonGroceryItems } from "@/lib/db/schema";

/** Reference list powering the "quick add" chips on /request-service and
 *  the staff concierge order builder. Read-only from the app; seeded via
 *  migration (see 0014), editable directly in the DB until an admin UI
 *  exists. Ordered by sort_order so callers can group by category and
 *  trust both the category order and the item order within it. */
export async function getCommonGroceryItems() {
  const db = getDb();
  return db
    .select({ name: commonGroceryItems.name, category: commonGroceryItems.category })
    .from(commonGroceryItems)
    .orderBy(asc(commonGroceryItems.sortOrder));
}
