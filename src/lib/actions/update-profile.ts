"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { customerProfiles } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { firstFieldErrors, type ActionResult } from "@/lib/actions/types";

export async function updateProfile(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Please sign in to update your profile." };
  }

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    defaultDeliveryAddressLine1: formData.get("defaultDeliveryAddressLine1"),
    defaultDeliveryAddressLine2: formData.get("defaultDeliveryAddressLine2"),
    defaultDeliveryCity: formData.get("defaultDeliveryCity"),
    defaultDeliveryState: formData.get("defaultDeliveryState"),
    defaultDeliveryZip: formData.get("defaultDeliveryZip"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const data = parsed.data;
  const db = getDb();

  try {
    // Upsert on the auth_user_id unique constraint — a profile is
    // created the first time someone saves it, updated every time after.
    await db
      .insert(customerProfiles)
      .values({ authUserId: user.id, ...data })
      .onConflictDoUpdate({
        target: customerProfiles.authUserId,
        set: { ...data, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("[updateProfile] failed", error);
    return {
      ok: false,
      message: "We couldn't save your profile right now. Please try again shortly.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/orders/new");
  return { ok: true };
}

/** Used by /orders/new to pre-fill the order form. Returns null for a
 *  signed-in customer with no saved profile yet — a normal state. */
export async function getOwnProfile(authUserId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.authUserId, authUserId));
  return rows[0] ?? null;
}
