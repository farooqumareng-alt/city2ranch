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
 * Bound via JobActionButton (useActionState), not a bare form action —
 * this used to return void and silently do nothing on failure (order
 * not found, illegal transition); now returns ActionResult so a driver
 * actually sees why a tap didn't work.
 */
export async function markPickedUp(
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (prevState, formData) calling convention, unused here since there's no field data to round-trip
  _prev: ActionResult | undefined
): Promise<ActionResult> {
  const driver = await requireDriver();
  const user = await getCurrentUser();

  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    // Scoped to this driver's own assignment — never trust the id alone.
    .where(and(eq(orders.id, orderId), eq(orders.driverId, driver.id)));
  const order = rows[0];
  if (!order) return { ok: false, message: "Order not found." };

  if (order.status === "picked_up") return { ok: true }; // already applied — idempotent no-op

  try {
    assertTransition(order.status, "picked_up");
  } catch {
    return {
      ok: false,
      message: `This order can't be marked picked up from its current status (${order.status}).`,
    };
  }

  const updated = await db
    .update(orders)
    .set({ status: "picked_up", updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return {
      ok: false,
      message: `This order can't be marked picked up from its current status (${order.status}).`,
    };
  }

  await logAuditEvent({
    orderId: order.id,
    actorType: "driver",
    actorId: user?.id ?? null,
    action: "order_picked_up",
    previousState: order.status,
    newState: "picked_up",
  });

  revalidatePath("/internal/driver");
  return { ok: true };
}
