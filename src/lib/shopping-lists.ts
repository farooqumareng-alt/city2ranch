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

/**
 * For the /request-service quick-fill picker — every saved list's items
 * in one query, grouped in JS by listId, so choosing a list can fill the
 * shopping-list textarea without a second round trip. Deliberately one
 * query (a leftJoin), not getOwnShoppingLists() + N getShoppingListItems()
 * calls — with the DB pool at max:1 per serverless instance, N "parallel"
 * queries actually serialize through one physical connection, and each
 * round trip to the pooler costs real cross-region latency (~300ms+).
 * A customer with several saved lists was turning this into seconds of
 * stacked-up wait on every /request-service load.
 */
export async function getOwnShoppingListsWithItems(ownerId: string) {
  const db = getDb();
  const rows = await db
    .select({
      listId: shoppingLists.id,
      listName: shoppingLists.name,
      listSortOrder: shoppingLists.sortOrder,
      listCreatedAt: shoppingLists.createdAt,
      itemId: shoppingListItems.id,
      itemName: shoppingListItems.itemName,
      itemQuantity: shoppingListItems.quantity,
      itemNotes: shoppingListItems.notes,
      itemSortOrder: shoppingListItems.sortOrder,
    })
    .from(shoppingLists)
    .leftJoin(shoppingListItems, eq(shoppingListItems.listId, shoppingLists.id))
    .where(eq(shoppingLists.authUserId, ownerId))
    .orderBy(
      asc(shoppingLists.sortOrder),
      desc(shoppingLists.createdAt),
      asc(shoppingListItems.sortOrder)
    );

  const lists = new Map<string, { id: string; name: string; items: { itemName: string; quantity: string; notes: string | null }[] }>();
  for (const row of rows) {
    if (!lists.has(row.listId)) {
      lists.set(row.listId, { id: row.listId, name: row.listName, items: [] });
    }
    if (row.itemId) {
      lists.get(row.listId)!.items.push({
        itemName: row.itemName!,
        quantity: row.itemQuantity!,
        notes: row.itemNotes,
      });
    }
  }
  return [...lists.values()];
}
