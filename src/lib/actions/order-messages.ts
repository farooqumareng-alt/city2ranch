"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orderMessages, orders, staff } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/supabase/server";
import { canPerform, getEffectiveOwnerWithRole } from "@/lib/household";

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

  // eq(staff.isActive, true) added in the security remediation pass —
  // this was the one staff check in the codebase that bypassed
  // requireStaff() and so never checked is_active, meaning a disabled
  // ex-staff account could still post a message flagged "staff" on any
  // order.
  const staffRows = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.authUserId, user.id), eq(staff.isActive, true)));
  const isStaff = staffRows.length > 0;

  if (!isStaff) {
    const { ownerId, role } = await getEffectiveOwnerWithRole(user.id);
    if (!canPerform(role, "message")) return;
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

  revalidatePath(`/my-services/${orderId}`);
  revalidatePath(`/internal/dispatch/orders/${orderId}`);
}
