"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { customerPlaces } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { placeSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";
import { getEffectiveOwnerId } from "@/lib/household";

const FORM_FIELDS = ["label", "addressLine1", "addressLine2", "city", "state", "zip", "deliveryInstructions"];

/** Used by /places and the order form's "use a saved place" picker. */
export async function getOwnPlaces(authUserId: string) {
  const db = getDb();
  return db
    .select()
    .from(customerPlaces)
    .where(eq(customerPlaces.authUserId, authUserId))
    .orderBy(desc(customerPlaces.isDefault), asc(customerPlaces.sortOrder), asc(customerPlaces.createdAt));
}

function parsePlace(formData: FormData) {
  return placeSchema.safeParse({
    label: formData.get("label"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    deliveryInstructions: formData.get("deliveryInstructions"),
  });
}

export async function createPlace(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to save a place." };
  const ownerId = await getEffectiveOwnerId(user.id);

  const parsed = parsePlace(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  try {
    const db = getDb();
    // A customer's first saved place becomes their default automatically
    // — no reason to make them take a second action for the common case.
    const existing = await db
      .select({ id: customerPlaces.id })
      .from(customerPlaces)
      .where(eq(customerPlaces.authUserId, ownerId));

    await db.insert(customerPlaces).values({
      authUserId: ownerId,
      ...parsed.data,
      isDefault: existing.length === 0,
    });
  } catch (error) {
    console.error("[createPlace] failed", error);
    return {
      ok: false,
      message: "We couldn't save this place right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  revalidatePath("/places");
  revalidatePath("/orders/new");
  redirect("/places");
}

export async function updatePlace(
  placeId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to update this place." };
  const ownerId = await getEffectiveOwnerId(user.id);

  const parsed = parsePlace(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  try {
    const db = getDb();
    await db
      .update(customerPlaces)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(customerPlaces.id, placeId), eq(customerPlaces.authUserId, ownerId)));
  } catch (error) {
    console.error("[updatePlace] failed", error);
    return {
      ok: false,
      message: "We couldn't save this place right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  revalidatePath("/places");
  revalidatePath("/orders/new");
  redirect("/places");
}

export async function deletePlace(placeId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  await db
    .delete(customerPlaces)
    .where(and(eq(customerPlaces.id, placeId), eq(customerPlaces.authUserId, ownerId)));

  revalidatePath("/places");
  revalidatePath("/orders/new");
}

export async function setDefaultPlace(placeId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const ownerId = await getEffectiveOwnerId(user.id);

  const db = getDb();
  // Two statements, not one clever query — clearer to read, and this
  // action runs rarely enough that a brief window between them is fine.
  await db
    .update(customerPlaces)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(and(eq(customerPlaces.authUserId, ownerId), eq(customerPlaces.isDefault, true)));
  await db
    .update(customerPlaces)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(and(eq(customerPlaces.id, placeId), eq(customerPlaces.authUserId, ownerId)));

  revalidatePath("/places");
  revalidatePath("/orders/new");
}
