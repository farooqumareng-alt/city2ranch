"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";
import type { ActionResult } from "@/lib/actions/types";

/** Used by /notifications. A customer who's never visited the page has
 *  no row yet — that's the same as every toggle being on (see the
 *  schema doc comment), not an error state. */
export async function getOwnNotificationPreferences(authUserId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.authUserId, authUserId));
  return rows[0] ?? { paymentReceipts: true, recurringOrderCreated: true };
}

export async function updateNotificationPreferences(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Please sign in to update your notification preferences." };
  }
  // A household member (see src/lib/household.ts) sets the owner's
  // shared preferences, not a separate set of their own — the emails
  // this gates (e.g. a payment receipt) go to the order's owner either
  // way.
  const ownerId = await getEffectiveOwnerId(user.id);

  // A checkbox's absence from FormData means "unchecked", not "field
  // missing" — there's no validation to fail here.
  const paymentReceipts = formData.get("paymentReceipts") === "on";
  const recurringOrderCreated = formData.get("recurringOrderCreated") === "on";

  try {
    const db = getDb();
    await db
      .insert(notificationPreferences)
      .values({ authUserId: ownerId, paymentReceipts, recurringOrderCreated })
      .onConflictDoUpdate({
        target: notificationPreferences.authUserId,
        set: { paymentReceipts, recurringOrderCreated, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("[updateNotificationPreferences] failed", error);
    return {
      ok: false,
      message: "We couldn't save your preferences right now. Please try again shortly.",
    };
  }

  revalidatePath("/notifications");
  return { ok: true };
}
