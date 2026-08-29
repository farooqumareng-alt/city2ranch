"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { membershipSettings } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import type { ActionResult } from "@/lib/actions/types";

/** Used by both the customer-facing /membership page and the staff
 *  settings page. The seeding migration (0028_membership.sql) means a
 *  row should always exist in production, but a fresh/partially-migrated
 *  dev database is still safe — same "missing row = safe default"
 *  pattern as notification_preferences, and here the safe default is
 *  sales staying off. */
export async function getMembershipSettings() {
  const db = getDb();
  const rows = await db.select().from(membershipSettings).limit(1);
  return rows[0] ?? { id: null, salesEnabled: false, updatedAt: null };
}

/** Staff-only toggle for whether customers can subscribe at all — see
 *  the doc comment on membershipSettings in src/lib/db/schema.ts for
 *  why this exists and defaults to off. */
export async function setMembershipSalesEnabled(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();

  const salesEnabled = formData.get("salesEnabled") === "on";

  try {
    const db = getDb();
    const existing = await db.select({ id: membershipSettings.id }).from(membershipSettings).limit(1);

    if (existing[0]) {
      await db
        .update(membershipSettings)
        .set({ salesEnabled, updatedAt: new Date() })
        .where(eq(membershipSettings.id, existing[0].id));
    } else {
      // Shouldn't happen once 0028_membership.sql has run, but don't
      // leave staff stuck with a broken toggle if it somehow hasn't.
      await db.insert(membershipSettings).values({ salesEnabled });
    }
  } catch (error) {
    console.error("[setMembershipSalesEnabled] failed", error);
    return { ok: false, message: "We couldn't save this setting right now. Please try again shortly." };
  }

  revalidatePath("/internal/dispatch/settings");
  revalidatePath("/membership");
  return { ok: true };
}
