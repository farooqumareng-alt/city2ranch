"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Bound to the "Mark picked up" form as `markPickedUp.bind(null, order.id)`
 * — same plain-<form>, no-useActionState pattern as approveAndPayOrder,
 * since there's no field input to round-trip errors for.
 */
export async function markPickedUp(orderId: string) {
  const driver = await requireDriver();
  const user = await getCurrentUser();

  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    // Scoped to this driver's own assignment — never trust the id alone.
    .where(and(eq(orders.id, orderId), eq(orders.driverId, driver.id)));
  const order = rows[0];
  if (!order) return;

  if (order.status === "picked_up") return; // already applied — idempotent no-op
  assertTransition(order.status, "picked_up");

  await db
    .update(orders)
    .set({ status: "picked_up", updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await logAuditEvent({
    orderId: order.id,
    actorType: "driver",
    actorId: user?.id ?? null,
    action: "order_picked_up",
    previousState: order.status,
    newState: "picked_up",
  });

  revalidatePath("/internal/driver");
}
