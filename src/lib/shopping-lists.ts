import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { shoppingListItems, shoppingLists } from "@/lib/db/schema";

/** Used by /lists and the quick-fill picker on /request-service. */
export async function getOwnShoppingLists(ownerId: string) {
  const db = getDb();
  return db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.authUserId, ownerId))
    .orderBy(asc(shoppingLists.sortOrder), desc(shoppingLists.createdAt));
}

export async function getShoppingListItems(listId: string) {
  const db = getDb();
  return db
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, listId))
    .orderBy(asc(shoppingListItems.sortOrder));
}

/** For the /request-service quick-fill picker — every saved list's items
 *  in one query, grouped client-side by listId, so choosing a list can
 *  fill the shopping-list textarea without a second round trip. */
export async function getOwnShoppingListsWithItems(ownerId: string) {
  const lists = await getOwnShoppingLists(ownerId);
  const items = await Promise.all(lists.map((list) => getShoppingListItems(list.id)));
  return lists.map((list, i) => ({ ...list, items: items[i] }));
}
