"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";

/**
 * Lets a signed-in customer attach themselves to a concierge order staff
 * created before they necessarily had an account (the source
 * /request-service submission is guest-open). Matches by email only —
 * WHERE authUserId IS NULL guards against ever re-claiming an order that
 * already belongs to someone.
 */
export async function claimOrder(orderId: string) {
  const user = await getCurrentUser();
  if (!user?.email) return;

  const db = getDb();
  const [claimed] = await db
    .update(orders)
    .set({ authUserId: user.id, updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        isNull(orders.authUserId),
        sql`lower(${orders.customerEmail}) = lower(${user.email})`
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
