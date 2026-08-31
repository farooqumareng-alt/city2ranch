"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { storeSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

const FORM_FIELDS = ["name", "addressLine1", "city", "state", "zip", "phone"];
const LIST_PATH = "/internal/dispatch/stores";

/** Used by the stores list page and the /orders/new pickup-store dropdown
 *  (see src/app/(account)/orders/new/page.tsx, which filters isActive
 *  itself — this returns every row so the admin list can show disabled
 *  stores too). */
export async function listStores() {
  await requireStaff();
  const db = getDb();
  return db.select().from(stores).orderBy(stores.name);
}

function parseStore(formData: FormData) {
  return storeSchema.safeParse({
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    phone: formData.get("phone"),
  });
}

export async function createStore(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = parseStore(formData);
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
    await db.insert(stores).values(parsed.data);
  } catch (error) {
    console.error("[createStore] failed", error);
    return {
      ok: false,
      message: "We couldn't save this store right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  revalidatePath("/orders/new");
  redirect(LIST_PATH);
}

export async function updateStore(
  storeId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = parseStore(formData);
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
    await db.update(stores).set(parsed.data).where(eq(stores.id, storeId));
  } catch (error) {
    console.error("[updateStore] failed", error);
    return {
      ok: false,
      message: "We couldn't save this store right now. Please try again shortly.",
      values: valuesFromFormData(formData, FORM_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  revalidatePath("/orders/new");
  redirect(LIST_PATH);
}

/** Bound to an ActiveToggleButton as setStoreActive.bind(null, storeId) —
 *  same shape as setStaffActive/setDriverActive in team-management.ts. */
export async function setStoreActive(
  storeId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();
  const isActive = formData.get("isActive") === "true";

  try {
    const db = getDb();
    await db.update(stores).set({ isActive }).where(eq(stores.id, storeId));
  } catch (error) {
    console.error("[setStoreActive] failed", error);
    return { ok: false, message: "We couldn't update this store right now. Please try again shortly." };
  }

  revalidatePath(LIST_PATH);
  revalidatePath("/orders/new");
  return { ok: true };
}
