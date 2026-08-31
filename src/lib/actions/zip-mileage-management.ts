"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { zipMileage } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { zipMileageCreateSchema, zipMileageUpdateSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, valuesFromFormData, type ActionResult } from "@/lib/actions/types";

/** postgres-js throws a PostgresError with a real `.code` (the Postgres
 *  SQLSTATE, e.g. "23503" for a foreign-key violation, "23505" for a
 *  unique violation) — verified directly against this project's own
 *  database before relying on it, since the message text alone doesn't
 *  contain the numeric code. */
function pgErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

const CREATE_FIELDS = ["zip", "roundTripMiles", "label"];
const UPDATE_FIELDS = ["roundTripMiles", "label"];
const LIST_PATH = "/internal/dispatch/zip-coverage";

/** Backs both the admin ZIP Coverage list and, indirectly, every
 *  service-zone/pricing lookup in the app (getZipMileage,
 *  getServiceZoneStatus) — this export itself is admin-only (requireStaff),
 *  those reads stay separate and public-safe. */
export async function listZipMileage() {
  await requireStaff();
  const db = getDb();
  return db.select().from(zipMileage).orderBy(zipMileage.zip);
}

export async function createZipMileage(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = zipMileageCreateSchema.safeParse({
    zip: formData.get("zip"),
    roundTripMiles: formData.get("roundTripMiles"),
    label: formData.get("label"),
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
    await db.insert(zipMileage).values(parsed.data);
  } catch (error) {
    console.error("[createZipMileage] failed", error);
    // The unique constraint on zip is the likely real-world failure here
    // (adding a ZIP that's already covered) — a clearer message than the
    // generic fallback earns its keep for a mistake staff will actually make.
    const message =
      pgErrorCode(error) === "23505"
        ? "That ZIP code is already covered — edit the existing entry instead."
        : "We couldn't save this ZIP right now. Please try again shortly.";
    return { ok: false, message, values: valuesFromFormData(formData, CREATE_FIELDS) };
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

/**
 * Never touches `zip` itself — orders.deliveryZip and
 * recurringServicePlans.deliveryZip both FK to zip_mileage.zip (the text
 * value, not the row id), so changing it in place would silently
 * reattribute the pricing basis of every historical order at that ZIP.
 * Changing coverage for a ZIP means deleting and recreating the row
 * (blocked, correctly, while any order still references it — see
 * deleteZipMileage below).
 */
export async function updateZipMileage(
  zipMileageId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = zipMileageUpdateSchema.safeParse({
    roundTripMiles: formData.get("roundTripMiles"),
    label: formData.get("label"),
  });
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
    await db
      .update(zipMileage)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(zipMileage.id, zipMileageId));
  } catch (error) {
    console.error("[updateZipMileage] failed", error);
    return {
      ok: false,
      message: "We couldn't save this ZIP right now. Please try again shortly.",
      values: valuesFromFormData(formData, UPDATE_FIELDS),
    };
  }

  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

/** Bound to a plain form as deleteZipMileage.bind(null, id) — no
 *  useActionState, matching deletePlace's precedent, except this one
 *  really can fail in an expected way (orders reference the ZIP), so it
 *  returns ActionResult instead of void and the caller wraps it in
 *  JobActionButton to actually show that message. */
export async function deleteZipMileage(
  zipMileageId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's calling convention (via JobActionButton), unused here since there's no field data to round-trip
  _prev: ActionResult | undefined
): Promise<ActionResult> {
  await requireStaff();

  try {
    const db = getDb();
    await db.delete(zipMileage).where(eq(zipMileage.id, zipMileageId));
  } catch (error) {
    console.error("[deleteZipMileage] failed", error);
    // Postgres FK-violation code 23503 — real orders (or recurring
    // plans) still reference this ZIP. A friendly message, not a raw
    // constraint-violation error.
    if (pgErrorCode(error) === "23503") {
      return {
        ok: false,
        message: "This ZIP can't be deleted — one or more orders still reference it.",
      };
    }
    return { ok: false, message: "We couldn't delete this ZIP right now. Please try again shortly." };
  }

  revalidatePath(LIST_PATH);
  return { ok: true };
}
