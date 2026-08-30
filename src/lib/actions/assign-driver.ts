"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireStaff } from "@/lib/auth/roles";
import { assertTransition } from "@/lib/orders/status";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/types";

export async function assignDriver(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  // requireStaff() re-checked here, not just at the /internal/dispatch
  // layout — every action in this app re-verifies its own authorization.
  await requireStaff();
  const user = await getCurrentUser();

  const orderId = String(formData.get("orderId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  if (!orderId || !driverId) {
    return { ok: false, message: "Select a driver." };
  }

  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = rows[0];
  if (!order) return { ok: false, message: "Order not found." };

  try {
    assertTransition(order.status, "driver_assigned");
  } catch {
    return {
      ok: false,
      message: `This order can't be assigned from its current status (${order.status}).`,
    };
  }

  await db
    .update(orders)
    .set({
      driverId,
      status: "driver_assigned",
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await logAuditEvent({
    orderId,
    actorType: "staff",
    actorId: user?.id ?? null,
    action: "driver_assigned",
    previousState: order.status,
    newState: "driver_assigned",
    metadata: { driverId },
  });

  // Both paths: the queue (where this order actually lives) and the
  // dashboard (whose stats/Needs-Attention feed this mutation affects) —
  // without the second call the dashboard would show stale data until
  // an unrelated navigation forced a refetch.
  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");
  return { ok: true };
}
