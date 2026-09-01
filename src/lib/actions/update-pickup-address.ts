"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";
import { pickupAddressSchema } from "@/lib/validation/schemas";

/**
 * Lets a dispatcher add or correct a City Pickup order's specific
 * pickup address — the piece a brand-only store (see schema.ts's
 * comment on stores.addressLine1) can't supply itself. Deliberately
 * staff-level, not super-admin-only, matching every other dispatch
 * action (assign-driver, finalize-concierge-quote, etc.) — any active
 * staff member fields these calls.
 */
export async function updatePickupAddress(
  orderId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const parsed = pickupAddressSchema.safeParse({
    pickupAddressLine1: formData.get("pickupAddressLine1"),
    pickupAddressLine2: formData.get("pickupAddressLine2"),
    pickupCity: formData.get("pickupCity"),
    pickupState: formData.get("pickupState"),
    pickupZip: formData.get("pickupZip"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const db = getDb();
  const updated = await db
    .update(orders)
    .set({
      pickupAddressLine1: parsed.data.pickupAddressLine1,
      pickupAddressLine2: parsed.data.pickupAddressLine2 ?? null,
      pickupCity: parsed.data.pickupCity,
      pickupState: parsed.data.pickupState,
      pickupZip: parsed.data.pickupZip ?? null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return { ok: false, message: "Order not found." };
  }

  revalidatePath(`/internal/dispatch/orders/${orderId}`);
  revalidatePath(`/my-services/${orderId}`);
  revalidatePath(`/internal/driver/${orderId}`);
  return { ok: true };
}
