"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireDriver } from "@/lib/auth/roles";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/supabase/server";

/** Bound to "Mark on the way" as `markInTransit.bind(null, order.id)`. */
export async function markInTransit(orderId: string) {
  const driver = await requireDriver();
  const user = await getCurrentUser();

  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.driverId, driver.id)));
  const order = rows[0];
  if (!order) return;

  if (order.status === "in_transit") return; // idempotent no-op
  assertTransition(order.status, "in_transit");

  await db
    .update(orders)
    .set({ status: "in_transit", updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await logAuditEvent({
    orderId: order.id,
    actorType: "driver",
    actorId: user?.id ?? null,
    action: "order_in_transit",
    previousState: order.status,
    newState: "in_transit",
  });

  revalidatePath("/internal/driver");
}
