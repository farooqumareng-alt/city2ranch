"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/types";

/**
 * The one place `deliveryPin` is ever read back for comparison — this
 * runs server-side only and the value is never returned to the client,
 * unlike the driver's list/page queries, which must never select this
 * column at all (the driver has to ask the customer for it in person).
 */
export async function confirmDelivery(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const driver = await requireDriver();
  const user = await getCurrentUser();

  const orderId = String(formData.get("orderId") ?? "");
  const enteredPin = String(formData.get("pin") ?? "").trim();
  if (!orderId || !enteredPin) {
    return { ok: false, message: "Enter the customer's delivery PIN." };
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.driverId, driver.id)));
  const order = rows[0];
  if (!order) return { ok: false, message: "Order not found." };

  if (order.status === "completed") return { ok: true }; // idempotent no-op

  try {
    assertTransition(order.status, "completed");
  } catch {
    return {
      ok: false,
      message: `This order can't be completed from its current status (${order.status}).`,
    };
  }

  // Wrong PIN: no state change, no audit event — just ask the customer
  // to confirm and try again. Not logged as a failed attempt to avoid
  // building an unintentional PIN-guessing oracle in the audit trail.
  if (enteredPin !== order.deliveryPin) {
    return {
      ok: false,
      message: "That PIN doesn't match. Confirm it with the customer and try again.",
    };
  }

  const now = new Date();
  await db
    .update(orders)
    .set({
      status: "completed",
      pinVerifiedAt: now,
      deliveredAt: now,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));

  await logAuditEvent({
    orderId: order.id,
    actorType: "driver",
    actorId: user?.id ?? null,
    action: "order_delivered",
    previousState: order.status,
    newState: "completed",
  });

  revalidatePath("/internal/driver");
  return { ok: true };
}
