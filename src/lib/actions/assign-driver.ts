"use server";

import { and, eq } from "drizzle-orm";
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
    assertTransition(order.status, "pending_acceptance");
  } catch {
    return {
      ok: false,
      message: `This order can't be assigned from its current status (${order.status}).`,
    };
  }

  // Compare-and-swap on status: without this, two staff members
  // assigning different drivers to the same order at nearly the same
  // moment could both pass the assertTransition check above (both read
  // the pre-assignment status) and both write — the second silently
  // overwriting the first's driverId with no indication anything raced.
  //
  // Lands on pending_acceptance, not driver_assigned — the driver still
  // has to accept (see driver-accept-decline.ts) before they're
  // genuinely committed to the job.
  const updated = await db
    .update(orders)
    .set({
      driverId,
      status: "pending_acceptance",
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (updated.length === 0) {
    return {
      ok: false,
      message: "This order changed while you were working on it. Refresh and try again.",
    };
  }

  await logAuditEvent({
    orderId,
    actorType: "staff",
    actorId: user?.id ?? null,
    action: "driver_assigned",
    previousState: order.status,
    newState: "pending_acceptance",
    metadata: { driverId },
  });

  // All three: the queue (where this order actually lives), the
  // dashboard (whose stats/Needs-Attention feed this mutation affects),
  // and this order's own Service Record — without these an unrelated
  // navigation would be needed to see anything refresh.
  revalidatePath("/internal/dispatch/queue");
  revalidatePath("/internal/dispatch");
  revalidatePath(`/internal/dispatch/orders/${orderId}`);
  return { ok: true };
}
