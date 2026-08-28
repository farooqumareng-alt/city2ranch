"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { shoppingListItems, shoppingLists } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import { shoppingListSaveSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";

function parseList(formData: FormData) {
  return shoppingListSaveSchema.safeParse({
    name: formData.get("name"),
    itemsJson: formData.get("itemsJson"),
  });
}

export async function createShoppingList(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to save a list." };
  const ownerId = await getEffectiveOwnerId(user.id);

  const parsed = parseList(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const [list] = await tx
        .insert(shoppingLists)
        .values({ authUserId: ownerId, name: parsed.data.name })
        .returning({ id: shoppingLists.id });

      await tx.insert(shoppingListItems).values(
        parsed.data.itemsJson.map((item, index) => ({
          listId: list.id,
          itemName: item.itemName,
          quantity: item.quantity,
          notes: item.notes,
          sortOrder: index,
        }))
      );
    });
  } catch (error) {
    console.error("[createShoppingList] failed", error);
    return { ok: false, message: "We couldn't save this list right now. Please try again shortly." };
  }

  revalidatePath("/lists");
  revalidatePath("/request-service");
  redirect("/lists");
}

export async function updateShoppingList(
  listId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to update this list." };
  const ownerId = await getEffectiveOwnerId(user.id);

  const parsed = parseList(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      // Ownership check is this UPDATE itself matching zero rows (list
      // belongs to someone else) — the items replace below only runs if
      // it affected a row, same pattern finalizeConciergeQuote uses for
      // its fee-lines replace.
      const [list] = await tx
        .update(shoppingLists)
        .set({ name: parsed.data.name, updatedAt: new Date() })
        .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.authUserId, ownerId)))
        .returning({ id: shoppingLists.id });

      if (!list) return;

      await tx.delete(shoppingListItems).where(eq(shoppingListItems.listId, listId));
      await tx.insert(shoppingListItems).values(
        parsed.data.itemsJson.map((item, index) => ({
          listId,
          itemName: item.itemName,
          quantity: item.quantity,
          notes: item.notes,
          sortOrder: index,
        }))
      );
    });
  } catch (error) {
    console.error("[updateShoppingList] failed", error);
    return { ok: false, message: "We couldn't save this list right now. Please try again shortly." };
  }

  revalidatePath("/lists");
  revalidatePath("/request-service");
  redirect("/lists");
}

export async function deleteShoppingList(listId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  await db.delete(shoppingLists).where(and(eq(shoppingLists.id, listId), eq(shoppingLists.authUserId, ownerId)));

  revalidatePath("/lists");
  revalidatePath("/request-service");
}
