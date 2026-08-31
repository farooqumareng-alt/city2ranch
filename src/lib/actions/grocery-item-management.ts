"use server";

import { eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { commonGroceryItems } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { groceryItemCreateSchema, groceryItemUpdateSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

const CREATE_FIELDS = ["name", "category"];
const UPDATE_FIELDS = ["name"];
const LIST_PATH = "/internal/dispatch/grocery-items";

function pgErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/** Used by the admin list (grouped client-side by category) and, in
 *  principle, by anything wanting the full reference list — the public
 *  consumer, getCommonGroceryItems() in src/lib/grocery-items.ts, stays
 *  separate and un-gated (it's used from the guest-open /request-service
 *  form). */
export async function listGroceryItems() {
  await requireStaff();
  const db = getDb();
  return db.select().from(commonGroceryItems).orderBy(commonGroceryItems.sortOrder);
}

/**
 * sortOrder is one continuous sequence across every category (not reset
 * per category — see the doc comment on commonGroceryItems in
 * schema.ts), load-bearing for keeping each category's items grouped
 * under a plain ORDER BY. A new item is inserted right after the last
 * existing item in its own category, and every row after that point
 * shifts up by one — a real "insert into an ordered list," done inside
 * one transaction so the list is never observed half-shifted.
 */
export async function createGroceryItem(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = groceryItemCreateSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, CREATE_FIELDS),
    };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ sortOrder: commonGroceryItems.sortOrder })
        .from(commonGroceryItems)
        .where(eq(commonGroceryItems.category, parsed.data.category))
        .orderBy(sql`${commonGroceryItems.sortOrder} desc`)
        .limit(1);

      // A brand-new category has nothing to insert after — append to the
      // very end of the whole list instead.
      let insertAt: number;
      if (rows[0]) {
        insertAt = rows[0].sortOrder + 1;
        await tx
          .update(commonGroceryItems)
          .set({ sortOrder: sql`${commonGroceryItems.sortOrder} + 1` })
          .where(gt(commonGroceryItems.sortOrder, rows[0].sortOrder));
      } else {
        const [last] = await tx
          .select({ sortOrder: commonGroceryItems.sortOrder })
          .from(commonGroceryItems)
          .orderBy(sql`${commonGroceryItems.sortOrder} desc`)
          .limit(1);
        insertAt = (last?.sortOrder ?? -1) + 1;
      }

      await tx.insert(commonGroceryItems).values({ ...parsed.data, sortOrder: insertAt });
    });
  } catch (error) {
    console.error("[createGroceryItem] failed", error);
    const message =
      pgErrorCode(error) === "23505"
        ? "That item name already exists — edit the existing entry instead."
        : "We couldn't save this item right now. Please try again shortly.";
    return { ok: false, message, values: valuesFromFormData(formData, CREATE_FIELDS) };
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

/** Only ever renames — category and position stay fixed here on purpose
 *  (see the doc comment on groceryItemUpdateSchema): moving an item to a
 *  different category or position means delete-and-recreate, avoiding
 *  the reordering logic that would otherwise need to live in an edit
 *  path too. Low-stakes reference list; not worth the complexity. */
export async function updateGroceryItem(
  itemId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = groceryItemUpdateSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, UPDATE_FIELDS),
    };
  }

  try {
    const db = getDb();
    await db.update(commonGroceryItems).set(parsed.data).where(eq(commonGroceryItems.id, itemId));
  } catch (error) {
    console.error("[updateGroceryItem] failed", error);
    const message =
      pgErrorCode(error) === "23505"
        ? "That item name already exists."
        : "We couldn't save this item right now. Please try again shortly.";
    return { ok: false, message, values: valuesFromFormData(formData, UPDATE_FIELDS) };
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

/** Plain hard delete — nothing references this table by foreign key, and
 *  a gap left in sortOrder is harmless (ORDER BY works regardless). */
export async function deleteGroceryItem(itemId: string): Promise<void> {
  await requireStaff();
  const db = getDb();
  await db.delete(commonGroceryItems).where(eq(commonGroceryItems.id, itemId));
  revalidatePath(LIST_PATH);
}
