"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";
import { canPerform, getEffectiveOwner } from "@/lib/household";

/**
 * Lets a signed-in customer attach themselves to a concierge order staff
 * created before they necessarily had an account (the source
 * /request-service submission is guest-open). Matches by email only —
 * WHERE authUserId IS NULL guards against ever re-claiming an order that
 * already belongs to someone. A household member (see
 * src/lib/household.ts) claims on the owner's behalf — the order ends up
 * owned by the owner's authUserId, matched against the owner's email,
 * exactly like every other order the member sees.
 */
export async function claimOrder(orderId: string) {
  const user = await getCurrentUser();
  if (!user?.email) return;

  const owner = await getEffectiveOwner(user.id, user.email);
  // Attaching an unclaimed order to the owner's account is the same
  // "can this person commit the household to something" gate
  // submitOrder uses for a one-off order — a view-only household
  // member shouldn't be able to do this on the owner's behalf either.
  if (!canPerform(owner.role, "place_order")) return;

  const db = getDb();
  const [claimed] = await db
    .update(orders)
    .set({ authUserId: owner.id, updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        isNull(orders.authUserId),
        sql`lower(${orders.customerEmail}) = lower(${owner.email})`
      )
    )
    .returning({ id: orders.id });

  if (claimed) {
    await logAuditEvent({
      orderId: claimed.id,
      actorType: "customer",
      actorId: user.id,
      action: "order_claimed",
    });
  }

  revalidatePath("/orders");
}
