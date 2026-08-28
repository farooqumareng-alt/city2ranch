"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orderMessages, orders, staff } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEffectiveOwnerId } from "@/lib/household";

/**
 * Shared by both the customer order-detail page and the staff
 * concierge/dispatch views — one action, because the ownership check is
 * the only thing that differs and it's cheap to do both checks here
 * rather than fork into two near-identical actions.
 */
export async function postOrderMessage(orderId: string, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const db = getDb();

  const staffRows = await db.select({ id: staff.id }).from(staff).where(eq(staff.authUserId, user.id));
  const isStaff = staffRows.length > 0;

  if (!isStaff) {
    const ownerId = await getEffectiveOwnerId(user.id);
    const orderRows = await db.select({ authUserId: orders.authUserId }).from(orders).where(eq(orders.id, orderId));
    const owns = orderRows[0]?.authUserId === ownerId;
    if (!owns) return;
  }

  await db.insert(orderMessages).values({
    orderId,
    authorType: isStaff ? "staff" : "customer",
    authorId: user.id,
    body,
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/internal/dispatch/concierge/${orderId}`);
}
